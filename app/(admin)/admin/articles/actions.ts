"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createDraft } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";

export async function createDraftAction(): Promise<void> {
  await requireAdmin();

  const created = await createDraft();

  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${created.id}`);
}
