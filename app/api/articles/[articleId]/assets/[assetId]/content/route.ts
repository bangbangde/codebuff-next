import {
  AssetNotFoundError,
  AssetStorageError,
} from "@/features/article-assets/article-asset-errors";
import {
  assetIdParamSchema,
  articleIdParamSchema,
} from "@/features/article-assets/article-asset-validation";
import { readArticleAsset } from "@/features/article-assets/server/article-asset-service";
import { isArticlePublished } from "@/features/articles/server/article-service";

export const runtime = "nodejs";

function contentDisposition(filename: string) {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");

  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ articleId: string; assetId: string }> },
) {
  const { articleId, assetId } = await context.params;
  const parsedArticleId = articleIdParamSchema.safeParse(articleId);
  const parsedAssetId = assetIdParamSchema.safeParse(assetId);

  if (!parsedArticleId.success || !parsedAssetId.success) {
    return Response.json({ error: "资产不存在。" }, { status: 404 });
  }

  // 公开访问仅对已发布文章的资产开放；草稿资产需要 admin 鉴权路由。
  if (!(await isArticlePublished(parsedArticleId.data))) {
    return Response.json({ error: "资产不存在。" }, { status: 404 });
  }

  try {
    const { asset, body } = await readArticleAsset(
      parsedArticleId.data,
      parsedAssetId.data,
    );

    return new Response(Buffer.from(body), {
      headers: {
        // 公开资产可被中间层缓存；内容字节由 assetId（UUID）唯一标识，
        // 文章更新会替换 article_asset 行与 Garage 对象，但 assetId 不变。
        // 因此使用短时 public 缓存 + 不可变资产 URL 不足以做强校验，
        // 这里用 public max-age=300 + must-revalidate 平衡新鲜度与回源频率。
        "Cache-Control": "public, max-age=300, must-revalidate",
        "Content-Disposition": contentDisposition(asset.originalFilename),
        "Content-Length": String(body.byteLength),
        "Content-Type": asset.mediaType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return Response.json({ error: "资产不存在。" }, { status: 404 });
    }

    if (error instanceof AssetStorageError) {
      return Response.json(
        { error: "资产存储暂时不可用，请稍后重试。" },
        { status: 503 },
      );
    }

    console.error("Failed to read public article asset.", {
      articleId: parsedArticleId.data,
      assetId: parsedAssetId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "资产暂时无法读取，请稍后重试。" },
      { status: 503 },
    );
  }
}
