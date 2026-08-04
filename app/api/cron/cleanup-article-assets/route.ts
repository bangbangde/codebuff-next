import { timingSafeEqual } from "node:crypto";

import { cleanupArticleAssets } from "@/features/article-assets/server/article-asset-cleanup-service";

export const runtime = "nodejs";
// 清理任务通常由外部调度器（system cron / Vercel Cron / GitHub Actions）调用，
// 不需要 Next.js 的请求体解析，且可能携带 keepalive 以避免长连接超时。
export const dynamic = "force-dynamic";

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    console.error("CRON_SECRET is not configured.");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    if (constantTimeEqual(token, secret)) {
      return true;
    }
  }

  // 兼容部分调度器使用自定义 header 的场景
  const customHeader = request.headers.get("x-cron-secret");
  if (customHeader && constantTimeEqual(customHeader, secret)) {
    return true;
  }

  return false;
}

// 定时清理 Garage 临时资源和孤儿资源。
// 调度器需在 Authorization: Bearer <CRON_SECRET> 或 X-Cron-Secret header 中
// 携带与 CRON_SECRET 环境变量一致的密钥。
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const pendingDeleteGraceMs = url.searchParams.get("pendingDeleteGraceMs");
    const temporaryGraceMs = url.searchParams.get("temporaryGraceMs");
    const batchLimit = url.searchParams.get("batchLimit");

    const summary = await cleanupArticleAssets({
      pendingDeleteGraceMs: pendingDeleteGraceMs
        ? Number(pendingDeleteGraceMs)
        : undefined,
      temporaryGraceMs: temporaryGraceMs
        ? Number(temporaryGraceMs)
        : undefined,
      batchLimit: batchLimit ? Number(batchLimit) : undefined,
    });

    return Response.json(summary);
  } catch (error) {
    console.error("Article asset cleanup failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
