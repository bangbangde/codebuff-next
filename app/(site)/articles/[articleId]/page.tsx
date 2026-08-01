import { permanentRedirect } from "next/navigation";

export default async function LegacyArticlePage({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;
  permanentRedirect(`/notes/${articleId}`);
}
