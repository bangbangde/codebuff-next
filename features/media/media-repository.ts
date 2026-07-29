import type {
  CreatePendingMediaInput,
  MediaAsset,
  MediaFailureCode,
} from "./media-dto";

export interface MediaRepository {
  createPending(input: CreatePendingMediaInput): Promise<MediaAsset>;
  list(): Promise<readonly MediaAsset[]>;
  markFailed(id: string, failureCode: MediaFailureCode): Promise<MediaAsset>;
  markReady(id: string): Promise<MediaAsset>;
}
