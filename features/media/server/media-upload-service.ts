import "server-only";

import { randomUUID } from "node:crypto";

import type { MediaAsset } from "../media-dto";
import { MediaStorageError } from "../media-errors";
import { verifyMediaFile } from "../media-file-validation";
import type { MediaRepository } from "../media-repository";
import type { MediaObjectStorage } from "./media-object-storage";

export type MediaUploadDependencies = Readonly<{
  repository: MediaRepository;
  storage: MediaObjectStorage;
}>;

export async function uploadMediaAssetWithDependencies(
  file: File,
  dependencies: MediaUploadDependencies,
): Promise<MediaAsset> {
  const verified = await verifyMediaFile(file);
  const id = randomUUID();
  const objectKey = `media/${id}`;

  await dependencies.repository.createPending({
    byteSize: verified.byteSize,
    id,
    mediaType: verified.mediaType,
    objectKey,
    originalFilename: verified.originalFilename,
    sha256: verified.sha256,
  });

  try {
    await dependencies.storage.put({
      body: verified.body,
      byteSize: verified.byteSize,
      mediaType: verified.mediaType,
      objectKey,
      sha256: verified.sha256,
    });
  } catch (error) {
    console.error("Failed to write media object.", {
      assetId: id,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    try {
      await dependencies.repository.markFailed(id, "storage_unavailable");
    } catch (stateError) {
      console.error("Failed to persist media storage failure.", {
        assetId: id,
        cause:
          stateError instanceof Error ? stateError.name : "UnknownError",
      });
    }

    throw new MediaStorageError();
  }

  return dependencies.repository.markReady(id);
}
