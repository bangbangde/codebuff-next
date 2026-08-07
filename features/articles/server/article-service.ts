import "server-only";

import type {
  CategoryOption,
  PublishArticleInput,
  PublishArticleResult,
  PublishedArticleDetail,
  PublishedArticleSummary,
  TagOption,
  UpdateArticleInput,
} from "../article-dto";
import { parseCanonicalAssetReferenceIds, stripUploadPlaceholders } from "../article-asset-reference";
import { drizzleArticleRepository } from "./drizzle-article-repository";

export function createDraft() {
  return drizzleArticleRepository.createDraft();
}

export function listArticleSummaries() {
  return drizzleArticleRepository.listSummaries();
}

export function listCategories(): Promise<readonly CategoryOption[]> {
  return drizzleArticleRepository.listCategories();
}

export function listTags(): Promise<readonly TagOption[]> {
  return drizzleArticleRepository.listTags();
}

export function getArticleById(id: string) {
  return drizzleArticleRepository.findById(id);
}

export function updateArticle(input: UpdateArticleInput) {
  // 防御性剔除上传占位符：占位符只存在于前端编辑器状态，不应进入数据库。
  // 即使客户端已剔除，服务端也再执行一次，防止其他调用方写入内部占位符。
  const cleanedInput = {
    ...input,
    bodyMarkdown: stripUploadPlaceholders(input.bodyMarkdown),
  };
  return drizzleArticleRepository.update(
    cleanedInput,
    parseCanonicalAssetReferenceIds(cleanedInput.bodyMarkdown),
  );
}

export function publishArticle(
  input: PublishArticleInput,
): Promise<PublishArticleResult> {
  // 资产引用解析与校验在 repository 事务内完成（SELECT FOR UPDATE 锁行后
  // 读取 draftContent 快照），避免事务外读取导致校验过期。
  return drizzleArticleRepository.publish(input);
}

export function listPublishedArticles(): Promise<readonly PublishedArticleSummary[]> {
  return drizzleArticleRepository.listPublishedArticles();
}

export function getPublishedArticle(
  id: string,
): Promise<PublishedArticleDetail | null> {
  return drizzleArticleRepository.getPublishedArticle(id);
}

export function isArticlePublished(id: string): Promise<boolean> {
  return drizzleArticleRepository.isArticlePublished(id);
}
