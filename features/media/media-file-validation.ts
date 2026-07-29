import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";

import { fileTypeFromBuffer } from "file-type";

import {
  acceptedMediaTypes,
  maximumMediaBytes,
  type AcceptedMediaType,
  type VerifiedMediaFile,
} from "./media-dto";
import { MediaValidationError } from "./media-errors";

const acceptedTypeSet = new Set<string>(acceptedMediaTypes);

const extensionsByMediaType: Record<AcceptedMediaType, readonly string[]> = {
  "application/pdf": [".pdf"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

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
    throw new MediaValidationError("invalid_filename");
  }

  return normalized;
}

export async function verifyMediaFile(file: File): Promise<VerifiedMediaFile> {
  if (file.size === 0) {
    throw new MediaValidationError("empty_file");
  }

  if (file.size > maximumMediaBytes) {
    throw new MediaValidationError("file_too_large");
  }

  const originalFilename = validateFilename(file.name);
  const body = new Uint8Array(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(body);

  if (!detected || !acceptedTypeSet.has(detected.mime)) {
    throw new MediaValidationError("unsupported_media_type");
  }

  const mediaType = detected.mime as AcceptedMediaType;
  const extension = path.extname(originalFilename).toLowerCase();

  if (
    file.type !== mediaType ||
    !extensionsByMediaType[mediaType].includes(extension)
  ) {
    throw new MediaValidationError("signature_mismatch");
  }

  return {
    body,
    byteSize: body.byteLength,
    mediaType,
    originalFilename,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}
