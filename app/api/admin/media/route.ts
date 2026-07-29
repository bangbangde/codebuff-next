import { revalidatePath } from "next/cache";

import { maximumMediaBytes } from "@/features/media/media-dto";
import {
  MediaStorageError,
  MediaValidationError,
} from "@/features/media/media-errors";
import { uploadMediaAsset } from "@/features/media/server/media-service";
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

export async function POST(request: Request) {
  await requireAdmin();

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
    return Response.json({ error: "上传请求格式无效。" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "请选择一个文件。" }, { status: 400 });
  }

  try {
    const asset = await uploadMediaAsset(file);
    revalidatePath("/admin/media");

    return Response.json(
      {
        asset: {
          id: asset.id,
          status: asset.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return Response.json(
        { error: error.message },
        { status: validationStatus(error) },
      );
    }

    if (error instanceof MediaStorageError) {
      return Response.json(
        { error: "媒体存储暂时不可用；失败记录已保留，稍后可重试。" },
        { status: 503 },
      );
    }

    console.error("Failed to persist media upload.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "媒体记录暂时无法保存，请稍后重试。" },
      { status: 503 },
    );
  }
}
