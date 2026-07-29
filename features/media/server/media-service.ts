import "server-only";

import type { MediaAsset } from "../media-dto";
import { drizzleMediaRepository } from "./drizzle-media-repository";
import { garageMediaObjectStorage } from "./media-object-storage";
import { uploadMediaAssetWithDependencies } from "./media-upload-service";

export function listMediaAssets() {
  return drizzleMediaRepository.list();
}

export async function uploadMediaAsset(
  file: File,
): Promise<MediaAsset> {
  return uploadMediaAssetWithDependencies(file, {
    repository: drizzleMediaRepository,
    storage: garageMediaObjectStorage,
  });
}
