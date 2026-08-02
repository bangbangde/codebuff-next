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
  context: { params: Promise<{ noteId: string; assetId: string }> },
) {
  const { noteId, assetId } = await context.params;
  const parsedNoteId = articleIdParamSchema.safeParse(noteId);
  const parsedAssetId = assetIdParamSchema.safeParse(assetId);

  if (!parsedNoteId.success || !parsedAssetId.success) {
    return Response.json({ error: "资产不存在。" }, { status: 404 });
  }

  if (!(await isArticlePublished(parsedNoteId.data))) {
    return Response.json({ error: "资产不存在。" }, { status: 404 });
  }

  try {
    const { asset, body } = await readArticleAsset(
      parsedNoteId.data,
      parsedAssetId.data,
    );

    return new Response(Buffer.from(body), {
      headers: {
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

    console.error("Failed to read public note asset.", {
      noteId: parsedNoteId.data,
      assetId: parsedAssetId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "资产暂时无法读取，请稍后重试。" },
      { status: 503 },
    );
  }
}
