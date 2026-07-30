import { revalidatePath } from "next/cache";

import { maximumMediaBytes } from "@/features/media/media-dto";
import {
  MediaNotFoundError,
  MediaRetryMismatchError,
  MediaStateConflictError,
  MediaStorageError,
  MediaValidationError,
} from "@/features/media/media-errors";
import { retryMediaAsset } from "@/features/media/server/media-service";
import { mediaIdSchema } from "@/features/media/media-validation";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

const maximumMultipartBytes = maximumMediaBytes + 1024 * 1024;

function validationStatus(error: MediaValidationError) {
  if (error.code === "file_too_large") {
    return 413;
  }

  if (error.code === "unsupported_media_type") {
    return 415;
  }

  return 422;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ mediaId: string }> },
) {
  await requireAdmin();

  const { mediaId } = await context.params;
  const parsedId = mediaIdSchema.safeParse(mediaId);

  if (!parsedId.success) {
    return Response.json({ error: "媒体不存在。" }, { status: 404 });
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > maximumMultipartBytes
  ) {
    return Response.json(
      { error: "文件不能超过 10 MiB。" },
      { status: 413 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "重试请求格式无效。" },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json(
      { error: "请选择原始文件。" },
      { status: 400 },
    );
  }

  try {
    await retryMediaAsset(parsedId.data, file);
    revalidatePath("/admin/media");

    return Response.json({ status: "ready" });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return Response.json(
        { error: error.message },
        { status: validationStatus(error) },
      );
    }

    if (error instanceof MediaRetryMismatchError) {
      return Response.json(
        { error: "所选文件与失败记录不一致，请选择同一个原始文件。" },
        { status: 422 },
      );
    }

    if (error instanceof MediaNotFoundError) {
      return Response.json({ error: "媒体不存在。" }, { status: 404 });
    }

    if (error instanceof MediaStateConflictError) {
      return Response.json(
        { error: "媒体状态已变化，请刷新后重试。" },
        { status: 409 },
      );
    }

    if (error instanceof MediaStorageError) {
      return Response.json(
        { error: "媒体存储仍不可用；失败记录已保留。" },
        { status: 503 },
      );
    }

    console.error("Failed to retry media asset.", {
      assetId: parsedId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "媒体重试暂时失败，请稍后重试。" },
      { status: 503 },
    );
  }
}
