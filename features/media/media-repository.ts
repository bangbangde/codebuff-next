import type {
  CreatePendingMediaInput,
  MediaAsset,
  MediaFailureCode,
} from "./media-dto";

export interface MediaRepository {
  createPending(input: CreatePendingMediaInput): Promise<MediaAsset>;
  deleteUnreferenced(
    id: string,
    deleteObject: (asset: MediaAsset) => Promise<void>,
  ): Promise<"deleted" | "not_found" | "referenced" | "state_conflict">;
  findById(id: string): Promise<MediaAsset | null>;
  list(): Promise<readonly MediaAsset[]>;
  markFailed(id: string, failureCode: MediaFailureCode): Promise<MediaAsset>;
  markPendingForRetry(id: string): Promise<MediaAsset | null>;
  markReady(id: string): Promise<MediaAsset>;
}
