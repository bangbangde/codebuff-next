import "server-only";

import type { MediaReferenceOption } from "@/features/articles/article-media-reference";
import type { MediaAsset } from "../media-dto";
import { drizzleMediaRepository } from "./drizzle-media-repository";
import { garageMediaObjectStorage } from "./media-object-storage";
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
