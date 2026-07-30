import "server-only";

import type { MediaReferenceOption } from "@/features/articles/article-media-reference";
import type { MediaAsset } from "../media-dto";
import { drizzleMediaRepository } from "./drizzle-media-repository";
import { garageMediaObjectStorage } from "./media-object-storage";
import {
  deleteMediaAssetWithDependencies,
  readMediaAssetWithDependencies,
  retryMediaAssetWithDependencies,
} from "./media-lifecycle-service";
import { uploadMediaAssetWithDependencies } from "./media-upload-service";

export function listMediaAssets() {
  return drizzleMediaRepository.list();
}

export async function listReadyMediaReferenceOptions(): Promise<
  readonly MediaReferenceOption[]
> {
  const assets = await drizzleMediaRepository.list();

  return assets
    .filter((asset) => asset.status === "ready")
    .map((asset) => ({
      id: asset.id,
      mediaType: asset.mediaType,
      originalFilename: asset.originalFilename,
    }));
}

export async function uploadMediaAsset(
  file: File,
): Promise<MediaAsset> {
  return uploadMediaAssetWithDependencies(file, {
    repository: drizzleMediaRepository,
    storage: garageMediaObjectStorage,
  });
}

const lifecycleDependencies = {
  repository: drizzleMediaRepository,
  storage: garageMediaObjectStorage,
};

export function readMediaAsset(id: string) {
  return readMediaAssetWithDependencies(id, lifecycleDependencies);
}

export function retryMediaAsset(id: string, file: File) {
  return retryMediaAssetWithDependencies(
    id,
    file,
    lifecycleDependencies,
  );
}

export function deleteMediaAsset(id: string) {
  return deleteMediaAssetWithDependencies(id, lifecycleDependencies);
}
