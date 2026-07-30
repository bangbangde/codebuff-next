export class ArticleSlugConflictError extends Error {
  constructor(slug: string) {
    super(`An article already uses the slug "${slug}".`);
    this.name = "ArticleSlugConflictError";
  }
}

export class ArticleMediaUnavailableError extends Error {
  constructor() {
    super("Article references media that is unavailable.");
    this.name = "ArticleMediaUnavailableError";
  }
}
