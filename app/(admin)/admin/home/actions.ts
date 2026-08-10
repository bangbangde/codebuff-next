"use server";

import { revalidatePath } from "next/cache";

import type { HomeContentSectionKey } from "@/features/home-content/home-content-dto";
import {
  updateHomeContentSectionSchema,
  updateHomeLatestNotesConfigSchema,
} from "@/features/home-content/home-content-validation";
import { homeContentService } from "@/features/home-content/server/home-content-service";
import { listPublishedArticles } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";
import type {
  HomeLatestNotesFormState,
  HomeMarkdownFormState,
} from "./form-state";

async function updateMarkdownSection(
  sectionKey: HomeContentSectionKey,
  previousState: HomeMarkdownFormState,
  formData: FormData,
): Promise<HomeMarkdownFormState> {
  const session = await requireAdmin();
  const submittedMarkdown = formData.get("markdown");
  const parsed = updateHomeContentSectionSchema.safeParse({
    markdown:
      typeof submittedMarkdown === "string"
        ? submittedMarkdown.replace(/\r\n?/g, "\n")
        : submittedMarkdown,
    sectionKey,
    updatedBy: session.user.id,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      ...previousState,
      fieldErrors: { markdown: fieldErrors.markdown },
      formError: "Markdown 内容无效，请检查后再保存。",
      status: "error",
    };
  }

  try {
    await homeContentService.updateSection(parsed.data);
  } catch (error) {
    console.error(`Failed to update home ${sectionKey} section.`, error);

    return {
      ...previousState,
      fieldErrors: {},
      formError: "内容暂时无法保存，请稍后重试。",
      status: "error",
    };
  }

  revalidatePath("/");

  return {
    fieldErrors: {},
    formError: null,
    savedMarkdown: parsed.data.markdown,
    status: "saved",
  };
}

export async function updateNowAction(
  previousState: HomeMarkdownFormState,
  formData: FormData,
): Promise<HomeMarkdownFormState> {
  return updateMarkdownSection("now", previousState, formData);
}

export async function updateAboutAction(
  previousState: HomeMarkdownFormState,
  formData: FormData,
): Promise<HomeMarkdownFormState> {
  return updateMarkdownSection("about", previousState, formData);
}

export async function updateLatestNotesAction(
  previousState: HomeLatestNotesFormState,
  formData: FormData,
): Promise<HomeLatestNotesFormState> {
  const session = await requireAdmin();
  const pinnedNoteIds = formData
    .getAll("pinnedNoteIds")
    .map((value) => String(value).toLowerCase());
  const parsed = updateHomeLatestNotesConfigSchema.safeParse({
    displayLimit: Number(formData.get("displayLimit")),
    pinnedNoteIds,
    updatedBy: session.user.id,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      ...previousState,
      fieldErrors: {
        displayLimit: fieldErrors.displayLimit,
        pinnedNoteIds: fieldErrors.pinnedNoteIds,
      },
      formError: "Latest Notes 配置无效，请检查标出的字段。",
      status: "error",
    };
  }

  try {
    const publishedArticles = await listPublishedArticles();
    const publishedIds = new Set(
      publishedArticles.map((article) => article.id.toLowerCase()),
    );
    const hasIneligiblePin = parsed.data.pinnedNoteIds.some(
      (noteId) => !publishedIds.has(noteId),
    );

    if (hasIneligiblePin) {
      return {
        ...previousState,
        fieldErrors: {
          pinnedNoteIds: ["置顶列表只能包含当前已发布的笔记。"],
        },
        formError: "置顶列表包含不存在或未发布的笔记，请重新选择。",
        status: "error",
      };
    }

    await homeContentService.updateLatestNotesConfig(parsed.data);
  } catch (error) {
    console.error("Failed to update home Latest Notes config.", error);

    return {
      ...previousState,
      fieldErrors: {},
      formError: "Latest Notes 暂时无法保存，请稍后重试。",
      status: "error",
    };
  }

  revalidatePath("/");

  return {
    fieldErrors: {},
    formError: null,
    savedDisplayLimit: parsed.data.displayLimit,
    savedPinnedNoteIds: parsed.data.pinnedNoteIds,
    status: "saved",
  };
}
