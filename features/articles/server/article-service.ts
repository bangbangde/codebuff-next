import "server-only";

import { drizzleArticleRepository } from "./drizzle-article-repository";

export function listArticleSummaries() {
  return drizzleArticleRepository.listSummaries();
}
