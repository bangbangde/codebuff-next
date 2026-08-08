import { revalidatePath } from "next/cache";

import {
  ArticleNotFoundError,
  AssetStorageError,
  AssetValidationError,
} from "@/features/article-assets/article-asset-errors";
import { articleIdParamSchema } from "@/features/article-assets/article-asset-validation";
import { uploadArticleAsset } from "@/features/article-assets/server/article-asset-service";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

// 统一资源上传 HTTP 端点。客户端上传任务管理器通过 XHR 调用此端点，
// 以获取真实上传进度与取消能力（server action 不支持这两者）。
// 服务端复用 uploadArticleAsset 服务逻辑，与 server action 保持一致。
export async function POST(
  request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  await requireAdmin();

  const { noteId } = await context.params;
  const parsedNoteId = articleIdParamSchema.safeParse(noteId);

  if (!parsedNoteId.success) {
    return Response.json({ error: "笔记标识无效。" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "请选择要上传的文件。" }, { status: 400 });
  }

  try {
    const asset = await uploadArticleAsset(parsedNoteId.data, file);

    revalidatePath(`/admin/notes/${parsedNoteId.data}`);

    return Response.json({ asset });
  } catch (error) {
    if (error instanceof AssetValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ArticleNotFoundError) {
      return Response.json(
        { error: "这篇笔记已不存在，无法上传资产。" },
        { status: 404 },
      );
    }

    if (error instanceof AssetStorageError) {
      return Response.json(
        { error: "资产存储暂时不可用，请稍后重试。" },
        { status: 503 },
      );
    }

    console.error("Failed to upload article asset via API.", {
      noteId: parsedNoteId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "资产暂时无法上传，请稍后重试。" },
      { status: 500 },
    );
  }
}
