import "server-only";

import {
  createGarageObjectStore,
  type GarageObjectStore,
  type GarageObjectStoreConfig,
} from "@/lib/garage/garage-object-store";

type RequiredObjectStorageVariable =
  | "OBJECT_STORAGE_ACCESS_KEY_ID"
  | "OBJECT_STORAGE_BUCKET"
  | "OBJECT_STORAGE_ENDPOINT"
  | "OBJECT_STORAGE_SECRET_ACCESS_KEY";

const legacyObjectStorageVariables = {
  OBJECT_STORAGE_ACCESS_KEY_ID: "ARTICLE_S3_ACCESS_KEY_ID",
  OBJECT_STORAGE_BUCKET: "ARTICLE_S3_BUCKET",
  OBJECT_STORAGE_ENDPOINT: "ARTICLE_S3_ENDPOINT",
  OBJECT_STORAGE_SECRET_ACCESS_KEY: "ARTICLE_S3_SECRET_ACCESS_KEY",
} as const satisfies Record<RequiredObjectStorageVariable, string>;

function requiredEnvironmentVariable(name: RequiredObjectStorageVariable) {
  const legacyName = legacyObjectStorageVariables[name];
  const value = process.env[name]?.trim() || process.env[legacyName]?.trim();

  if (!value) {
    throw new Error(
      `Missing required object storage environment variable: ${name}`,
    );
  }

  return value;
}

export function getArticleStorageConfig(): GarageObjectStoreConfig {
  const endpoint = requiredEnvironmentVariable("OBJECT_STORAGE_ENDPOINT");

  try {
    new URL(endpoint);
  } catch {
    throw new Error("OBJECT_STORAGE_ENDPOINT must be an absolute URL.");
  }

  return {
    accessKeyId: requiredEnvironmentVariable("OBJECT_STORAGE_ACCESS_KEY_ID"),
    bucket: requiredEnvironmentVariable("OBJECT_STORAGE_BUCKET"),
    endpoint,
    region:
      process.env.OBJECT_STORAGE_REGION?.trim() ||
      process.env.ARTICLE_S3_REGION?.trim() ||
      "garage",
    secretAccessKey: requiredEnvironmentVariable(
      "OBJECT_STORAGE_SECRET_ACCESS_KEY",
    ),
  };
}

const storageGlobals = globalThis as typeof globalThis & {
  codebuffArticleObjectStore?: GarageObjectStore;
};

export function getArticleObjectStore(): GarageObjectStore {
  storageGlobals.codebuffArticleObjectStore ??= createGarageObjectStore(
    getArticleStorageConfig(),
  );

  return storageGlobals.codebuffArticleObjectStore;
}
