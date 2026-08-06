import { cleanupArticleAssets } from "@/features/article-assets/server/article-asset-cleanup-service";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";
// 页面退出时通过 navigator.sendBeacon 触发，不需请求体解析。
export const dynamic = "force-dynamic";

// 编辑页面关闭/刷新/离开时，由 pagehide 通过 navigator.sendBeacon 调用。
// 清理无引用超过 24 小时的 Garage 对象及对应数据库记录。
// 鉴权依赖会话 cookie（sendBeacon 自动携带同源 cookie），无需额外密钥。
// 接口幂等且限量（默认 100 条/次），sendBeacon 未送达只会延迟回收，
// 下次编辑页面退出时会再次触发。
export async function POST() {
  await requireAdmin();

  try {
    const summary = await cleanupArticleAssets();
    return Response.json(summary);
  } catch (error) {
    console.error("Article asset cleanup failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
