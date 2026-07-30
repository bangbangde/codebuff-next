export type MediaValidationCode =
  | "empty_file"
  | "file_too_large"
  | "invalid_filename"
  | "signature_mismatch"
  | "unsupported_media_type";

const validationMessages: Record<MediaValidationCode, string> = {
  empty_file: "请选择一个非空文件。",
  file_too_large: "文件不能超过 10 MiB。",
  invalid_filename: "文件名无效，请使用不包含路径的普通文件名。",
  signature_mismatch: "文件内容与声明的类型或扩展名不一致。",
  unsupported_media_type:
    "仅支持 JPEG、PNG、WebP、GIF、AVIF 和 PDF 文件。",
};

export class MediaValidationError extends Error {
  readonly code: MediaValidationCode;

  constructor(code: MediaValidationCode) {
    super(validationMessages[code]);
    this.code = code;
    this.name = "MediaValidationError";
  }
}

export class MediaStorageError extends Error {
  constructor() {
    super("Media storage operation failed.");
    this.name = "MediaStorageError";
  }
}

export class MediaNotFoundError extends Error {
  constructor() {
    super("Media asset was not found.");
    this.name = "MediaNotFoundError";
  }
}

export class MediaStateConflictError extends Error {
  constructor() {
    super("Media asset is not in the required lifecycle state.");
    this.name = "MediaStateConflictError";
  }
}

export class MediaRetryMismatchError extends Error {
  constructor() {
    super("Retry file does not match the failed media asset.");
    this.name = "MediaRetryMismatchError";
  }
}

export class MediaReferencedError extends Error {
  constructor() {
    super("Referenced media cannot be deleted.");
    this.name = "MediaReferencedError";
  }
}
