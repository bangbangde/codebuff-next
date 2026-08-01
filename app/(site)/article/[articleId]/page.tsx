import { permanentRedirect } from "next/navigation";

type LegacyArticlePageProps = {
  params: Promise<{ articleId: string }>;
};

export default async function LegacyArticlePage({ params }: LegacyArticlePageProps) {
  const { articleId } = await params;
  permanentRedirect(`/notes/${articleId}`);
}
