import {
  MediaNotFoundError,
  MediaStateConflictError,
  MediaStorageError,
} from "@/features/media/media-errors";
import { readMediaAsset } from "@/features/media/server/media-service";
import { mediaIdSchema } from "@/features/media/media-validation";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

function contentDisposition(filename: string) {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");

  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> },
) {
  await requireAdmin();

  const { mediaId } = await context.params;
  const parsedId = mediaIdSchema.safeParse(mediaId);

  if (!parsedId.success) {
    return Response.json({ error: "媒体不存在。" }, { status: 404 });
  }

  try {
    const { asset, body } = await readMediaAsset(parsedId.data);

    return new Response(Buffer.from(body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": contentDisposition(
          asset.originalFilename,
        ),
        "Content-Length": String(body.byteLength),
        "Content-Type": asset.mediaType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      error instanceof MediaNotFoundError ||
      error instanceof MediaStateConflictError
    ) {
      return Response.json({ error: "媒体不存在。" }, { status: 404 });
    }

    if (error instanceof MediaStorageError) {
      return Response.json(
        { error: "媒体存储暂时不可用，请稍后重试。" },
        { status: 503 },
      );
    }

    console.error("Failed to read media asset.", {
      assetId: parsedId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "媒体暂时无法读取，请稍后重试。" },
      { status: 503 },
    );
  }
}
