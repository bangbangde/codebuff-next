export const acceptedAssetTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
] as const;

export const maximumAssetBytes = 10 * 1024 * 1024;

export type AcceptedAssetType = (typeof acceptedAssetTypes)[number];

export type ArticleAssetStatus =
  | "uploading"
  | "temporary"
  | "active"
  | "pending_delete"
  | "deleting"
  | "deleted";

export type ArticleAsset = Readonly<{
  articleId: string;
  byteSize: number;
  createdAt: string;
  id: string;
  mediaType: AcceptedAssetType;
  objectKey: string;
  originalFilename: string;
  sha256: string;
  status: ArticleAssetStatus;
  statusUpdatedAt: string;
  updatedAt: string;
}>;

export type CreateArticleAssetInput = Readonly<{
  articleId: string;
  byteSize: number;
  id: string;
  mediaType: AcceptedAssetType;
  objectKey: string;
  originalFilename: string;
  sha256: string;
}>;

export type VerifiedAssetFile = Readonly<{
  body: Uint8Array;
  byteSize: number;
  mediaType: AcceptedAssetType;
  originalFilename: string;
  sha256: string;
}>;
