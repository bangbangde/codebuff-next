import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

export type GarageObjectStoreConfig = Readonly<{
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
}>;

export type PutGarageObjectInput = Readonly<{
  body: Uint8Array;
  byteSize: number;
  mediaType: string;
  objectKey: string;
  sha256: string;
}>;

export interface GarageObjectStore {
  delete(objectKey: string): Promise<void>;
  deleteBatch(objectKeys: string[]): Promise<void>;
  get(objectKey: string): Promise<Uint8Array>;
  put(input: PutGarageObjectInput): Promise<void>;
}

export function createGarageObjectStore(
  config: GarageObjectStoreConfig,
): GarageObjectStore {
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: config.region,
  });

  return {
    async delete(objectKey) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );
    },

    async deleteBatch(objectKeys: string[]) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: {
            Objects: objectKeys.map((key) => ({ Key: key })),
          },
        }),
      );
    },

    async get(objectKey) {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );

      if (!result.Body) {
        throw new Error("Garage object response did not include a body.");
      }

      return result.Body.transformToByteArray();
    },

    async put(input) {
      await client.send(
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
}
