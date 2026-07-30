export class ArticleAssetUnavailableError extends Error {
  constructor() {
    super("Article references an asset that is unavailable.");
    this.name = "ArticleAssetUnavailableError";
  }
}
