export type AssetValidationCode =
  | "empty_file"
  | "file_too_large"
  | "invalid_filename"
  | "signature_mismatch"
  | "unsupported_media_type";

const validationMessages: Record<AssetValidationCode, string> = {
  empty_file: "请选择一个非空文件。",
  file_too_large: "文件不能超过 10 MiB。",
  invalid_filename: "文件名无效，请使用不包含路径的普通文件名。",
  signature_mismatch: "文件内容与声明的类型或扩展名不一致。",
  unsupported_media_type:
    "仅支持 JPEG、PNG、WebP、GIF、AVIF 和 PDF 文件。",
};

export class AssetValidationError extends Error {
  readonly code: AssetValidationCode;

  constructor(code: AssetValidationCode) {
    super(validationMessages[code]);
    this.code = code;
    this.name = "AssetValidationError";
  }
}

export class AssetStorageError extends Error {
  constructor() {
    super("Article asset storage operation failed.");
    this.name = "AssetStorageError";
  }
}

export class AssetNotFoundError extends Error {
  constructor() {
    super("Article asset was not found.");
    this.name = "AssetNotFoundError";
  }
}

export class ArticleNotFoundError extends Error {
  constructor() {
    super("Article was not found.");
    this.name = "ArticleNotFoundError";
  }
}
