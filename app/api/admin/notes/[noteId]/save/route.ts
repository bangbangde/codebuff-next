import { revalidatePath } from "next/cache";

import { ArticleAssetReferenceSyntaxError } from "@/features/articles/article-asset-reference";
import { ArticleAssetUnavailableError } from "@/features/articles/article-errors";
import {
  articleCreateSchema,
  articleMutationReferenceSchema,
  readArticleValues,
} from "@/features/articles/article-validation";
import { updateArticle } from "@/features/articles/server/article-service";
import { articleIdParamSchema } from "@/features/article-assets/article-asset-validation";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

// 卸载阶段（pagehide/beforeunload）用于兜底保存草稿的端点。
// 客户端以 fetch + keepalive 发起，服务端复用 updateArticle 服务逻辑，
// 返回最小 JSON 以便（若页面未真正卸载）同步修订号。
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
  const values = readArticleValues(formData);
  const reference = articleMutationReferenceSchema.safeParse({
    articleId: parsedNoteId.data,
    expectedRevision: formData.get("expectedRevision"),
  });
  const fields = articleCreateSchema.safeParse(values);

  if (!reference.success || !fields.success) {
    return Response.json({ error: "校验未通过。" }, { status: 400 });
  }

  try {
    const result = await updateArticle({
      ...fields.data,
      expectedRevision: reference.data.expectedRevision,
      id: reference.data.articleId,
    });

    if (result.status === "conflict" || result.status === "not_found") {
      return Response.json(
        { status: result.status, savedRevision: null },
        { status: 409 },
      );
    }

    revalidatePath("/admin/notes");
    revalidatePath(`/admin/notes/${reference.data.articleId}`);

    return Response.json({
      status: "saved",
      savedRevision: result.article.draftRevision,
    });
  } catch (error) {
    if (error instanceof ArticleAssetReferenceSyntaxError) {
      return Response.json({ error: "资产引用格式无效。" }, { status: 400 });
    }

    if (error instanceof ArticleAssetUnavailableError) {
      return Response.json({ error: "存在无效资产引用。" }, { status: 400 });
    }

    console.error("Failed to flush save on unload.", {
      noteId: parsedNoteId.data,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json({ error: "保存失败。" }, { status: 500 });
  }
}
