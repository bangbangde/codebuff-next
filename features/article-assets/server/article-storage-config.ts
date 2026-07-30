import "server-only";

import {
  createGarageObjectStore,
  type GarageObjectStore,
  type GarageObjectStoreConfig,
} from "@/lib/garage/garage-object-store";

type RequiredArticleStorageVariable =
  | "ARTICLE_S3_ACCESS_KEY_ID"
  | "ARTICLE_S3_BUCKET"
  | "ARTICLE_S3_ENDPOINT"
  | "ARTICLE_S3_SECRET_ACCESS_KEY";

function requiredEnvironmentVariable(name: RequiredArticleStorageVariable) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required article storage environment variable: ${name}`,
    );
  }

  return value;
}

export function getArticleStorageConfig(): GarageObjectStoreConfig {
  const endpoint = requiredEnvironmentVariable("ARTICLE_S3_ENDPOINT");

  try {
    new URL(endpoint);
  } catch {
    throw new Error("ARTICLE_S3_ENDPOINT must be an absolute URL.");
  }

  return {
    accessKeyId: requiredEnvironmentVariable("ARTICLE_S3_ACCESS_KEY_ID"),
    bucket: requiredEnvironmentVariable("ARTICLE_S3_BUCKET"),
    endpoint,
    region: process.env.ARTICLE_S3_REGION?.trim() || "garage",
    secretAccessKey: requiredEnvironmentVariable(
      "ARTICLE_S3_SECRET_ACCESS_KEY",
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
