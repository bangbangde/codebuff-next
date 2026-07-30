import { revalidatePath } from "next/cache";

import {
  MediaNotFoundError,
  MediaReferencedError,
  MediaStateConflictError,
  MediaStorageError,
} from "@/features/media/media-errors";
import { deleteMediaAsset } from "@/features/media/server/media-service";
import { mediaIdSchema } from "@/features/media/media-validation";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function DELETE(
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
    await deleteMediaAsset(parsedId.data);
    revalidatePath("/admin/media");

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof MediaNotFoundError) {
      return Response.json({ error: "媒体不存在。" }, { status: 404 });
    }

    if (error instanceof MediaReferencedError) {
      return Response.json(
        { error: "该媒体仍被文章引用，移除引用后才能删除。" },
        { status: 409 },
      );
    }

    if (error instanceof MediaStateConflictError) {
      return Response.json(
        { error: "正在处理的媒体暂时不能删除。" },
        { status: 409 },
      );
    }

    if (error instanceof MediaStorageError) {
      return Response.json(
        { error: "媒体存储暂时不可用；记录未被删除。" },
        { status: 503 },
      );
    }

    console.error("Failed to delete media asset.", {
      assetId: parsedId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "媒体暂时无法删除，请稍后重试。" },
      { status: 503 },
    );
  }
}
