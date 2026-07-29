export const acceptedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
] as const;

export const mediaAssetStatuses = ["pending", "ready", "failed"] as const;

export const mediaFailureCodes = ["storage_unavailable"] as const;

export const maximumMediaBytes = 10 * 1024 * 1024;

export type AcceptedMediaType = (typeof acceptedMediaTypes)[number];
export type MediaAssetStatus = (typeof mediaAssetStatuses)[number];
export type MediaFailureCode = (typeof mediaFailureCodes)[number];

export type MediaAsset = Readonly<{
  byteSize: number;
  createdAt: string;
  failureCode: MediaFailureCode | null;
  id: string;
  mediaType: AcceptedMediaType;
  objectKey: string;
  originalFilename: string;
  sha256: string;
  status: MediaAssetStatus;
  updatedAt: string;
}>;

export type CreatePendingMediaInput = Readonly<{
  byteSize: number;
  id: string;
  mediaType: AcceptedMediaType;
  objectKey: string;
  originalFilename: string;
  sha256: string;
}>;

export type VerifiedMediaFile = Readonly<{
  body: Uint8Array;
  byteSize: number;
  mediaType: AcceptedMediaType;
  originalFilename: string;
  sha256: string;
}>;
