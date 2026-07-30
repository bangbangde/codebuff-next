export class ArticleSlugConflictError extends Error {
  constructor(slug: string) {
    super(`An article already uses the slug "${slug}".`);
    this.name = "ArticleSlugConflictError";
  }
}

export class ArticleAssetUnavailableError extends Error {
  constructor() {
    super("Article references an asset that is unavailable.");
    this.name = "ArticleAssetUnavailableError";
  }
}
