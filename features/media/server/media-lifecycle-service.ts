import "server-only";

import type { MediaAsset } from "../media-dto";
import {
  MediaNotFoundError,
  MediaReferencedError,
  MediaRetryMismatchError,
  MediaStateConflictError,
  MediaStorageError,
} from "../media-errors";
import { verifyMediaFile } from "../media-file-validation";
import type { MediaRepository } from "../media-repository";
import type { MediaObjectStorage } from "./media-object-storage";

export type MediaLifecycleDependencies = Readonly<{
  repository: MediaRepository;
  storage: MediaObjectStorage;
}>;

export async function readMediaAssetWithDependencies(
  id: string,
  dependencies: MediaLifecycleDependencies,
): Promise<Readonly<{ asset: MediaAsset; body: Uint8Array }>> {
  const asset = await dependencies.repository.findById(id);

  if (!asset) {
    throw new MediaNotFoundError();
  }

  if (asset.status !== "ready") {
    throw new MediaStateConflictError();
  }

  try {
    return {
      asset,
      body: await dependencies.storage.get(asset.objectKey),
    };
  } catch {
    throw new MediaStorageError();
  }
}

export async function retryMediaAssetWithDependencies(
  id: string,
  file: File,
  dependencies: MediaLifecycleDependencies,
): Promise<MediaAsset> {
  const asset = await dependencies.repository.findById(id);

  if (!asset) {
    throw new MediaNotFoundError();
  }

  if (asset.status !== "failed") {
    throw new MediaStateConflictError();
  }

  const verified = await verifyMediaFile(file);

  if (
    verified.byteSize !== asset.byteSize ||
    verified.mediaType !== asset.mediaType ||
    verified.sha256 !== asset.sha256
  ) {
    throw new MediaRetryMismatchError();
  }

  const pending = await dependencies.repository.markPendingForRetry(id);

  if (!pending) {
    throw new MediaStateConflictError();
  }

  try {
    await dependencies.storage.put({
      body: verified.body,
      byteSize: asset.byteSize,
      mediaType: asset.mediaType,
      objectKey: asset.objectKey,
      sha256: asset.sha256,
    });
  } catch {
    try {
      await dependencies.repository.markFailed(
        id,
        "storage_unavailable",
      );
    } catch {
      // Preserve the original storage failure at the boundary.
    }

    throw new MediaStorageError();
  }

  return dependencies.repository.markReady(id);
}

export async function deleteMediaAssetWithDependencies(
  id: string,
  dependencies: MediaLifecycleDependencies,
): Promise<void> {
  let result: Awaited<
    ReturnType<MediaRepository["deleteUnreferenced"]>
  >;

  try {
    result = await dependencies.repository.deleteUnreferenced(
      id,
      (asset) => dependencies.storage.delete(asset.objectKey),
    );
  } catch {
    throw new MediaStorageError();
  }

  if (result === "not_found") {
    throw new MediaNotFoundError();
  }

  if (result === "referenced") {
    throw new MediaReferencedError();
  }

  if (result === "state_conflict") {
    throw new MediaStateConflictError();
  }
}
