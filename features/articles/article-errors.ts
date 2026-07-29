export class ArticleSlugConflictError extends Error {
  constructor(slug: string) {
    super(`An article already uses the slug "${slug}".`);
    this.name = "ArticleSlugConflictError";
  }
}
