import "server-only";

import type {
  CreateArticleInput,
  DeleteArticleInput,
  UpdateArticleInput,
} from "../article-dto";
import { parseCanonicalMediaReferenceIds } from "../article-media-reference";
import { drizzleArticleRepository } from "./drizzle-article-repository";

export function createArticle(input: CreateArticleInput) {
  return drizzleArticleRepository.create(
    input,
    parseCanonicalMediaReferenceIds(input.bodyMarkdown),
  );
}

export function listArticleSummaries() {
  return drizzleArticleRepository.listSummaries();
}

export function getArticleById(id: string) {
  return drizzleArticleRepository.findById(id);
}

export function updateArticle(input: UpdateArticleInput) {
  return drizzleArticleRepository.update(
    input,
    parseCanonicalMediaReferenceIds(input.bodyMarkdown),
  );
}

export function deleteArticle(input: DeleteArticleInput) {
  return drizzleArticleRepository.delete(input);
}
