import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";

import { fileTypeFromBuffer } from "file-type";

import {
  acceptedAssetTypes,
  maximumAssetBytes,
  type AcceptedAssetType,
  type VerifiedAssetFile,
} from "./article-asset-dto";
import { AssetValidationError } from "./article-asset-errors";

const acceptedTypeSet = new Set<string>(acceptedAssetTypes);

const extensionsByMediaType: Record<AcceptedAssetType, readonly string[]> = {
  "application/pdf": [".pdf"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

// 浏览器偶尔发送非标准 MIME 类型（如 image/jpg），归一化后再比较
const mimeTypeAliases: Record<string, string> = {
  "image/jpg": "image/jpeg",
};

function normalizeMimeType(type: string): string {
  return mimeTypeAliases[type] ?? type;
}

function validateFilename(filename: string) {
  const normalized = filename.normalize("NFC");

  if (
    !normalized ||
    normalized.length > 255 ||
    normalized.includes("\0") ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    path.basename(normalized) !== normalized
  ) {
    throw new AssetValidationError("invalid_filename");
  }

  return normalized;
}

export async function verifyAssetFile(
  file: File,
): Promise<VerifiedAssetFile> {
  if (file.size === 0) {
    throw new AssetValidationError("empty_file");
  }

  if (file.size > maximumAssetBytes) {
    throw new AssetValidationError("file_too_large");
  }

  const originalFilename = validateFilename(file.name);
  const body = new Uint8Array(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(body);

  if (!detected || !acceptedTypeSet.has(detected.mime)) {
    throw new AssetValidationError("unsupported_media_type");
  }

  const mediaType = detected.mime as AcceptedAssetType;
  const extension = path.extname(originalFilename).toLowerCase();

  if (
    normalizeMimeType(file.type) !== mediaType ||
    !extensionsByMediaType[mediaType].includes(extension)
  ) {
    throw new AssetValidationError("signature_mismatch");
  }

  return {
    body,
    byteSize: body.byteLength,
    mediaType,
    originalFilename,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}
