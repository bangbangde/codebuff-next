import "server-only";

import type { CreateArticleInput } from "../article-dto";
import { drizzleArticleRepository } from "./drizzle-article-repository";

export function createArticle(input: CreateArticleInput) {
  return drizzleArticleRepository.create(input);
}

export function listArticleSummaries() {
  return drizzleArticleRepository.listSummaries();
}
