import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { AcceptedMediaType } from "../media-dto";
import { getMediaStorageConfig } from "./media-storage-config";

export type PutMediaObjectInput = Readonly<{
  body: Uint8Array;
  byteSize: number;
  mediaType: AcceptedMediaType;
  objectKey: string;
  sha256: string;
}>;

export interface MediaObjectStorage {
  delete(objectKey: string): Promise<void>;
  get(objectKey: string): Promise<Uint8Array>;
  put(input: PutMediaObjectInput): Promise<void>;
}

const storageGlobals = globalThis as typeof globalThis & {
  codebuffMediaS3Client?: S3Client;
};

function getMediaS3Client() {
  const config = getMediaStorageConfig();

  storageGlobals.codebuffMediaS3Client ??= new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: config.region,
  });

  return storageGlobals.codebuffMediaS3Client;
}

export const garageMediaObjectStorage: MediaObjectStorage = {
  async delete(objectKey) {
    const config = getMediaStorageConfig();

    await getMediaS3Client().send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
  },

  async get(objectKey) {
    const config = getMediaStorageConfig();
    const result = await getMediaS3Client().send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );

    if (!result.Body) {
      throw new Error("Media object response did not include a body.");
    }

    return result.Body.transformToByteArray();
  },

  async put(input) {
    const config = getMediaStorageConfig();

    await getMediaS3Client().send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: config.bucket,
        ContentLength: input.byteSize,
        ContentType: input.mediaType,
        Key: input.objectKey,
        Metadata: {
          sha256: input.sha256,
        },
      }),
    );
  },
};
