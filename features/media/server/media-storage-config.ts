import "server-only";

export type MediaStorageConfig = Readonly<{
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
}>;

type RequiredMediaStorageVariable =
  | "MEDIA_S3_ACCESS_KEY_ID"
  | "MEDIA_S3_BUCKET"
  | "MEDIA_S3_ENDPOINT"
  | "MEDIA_S3_SECRET_ACCESS_KEY";

function requiredEnvironmentVariable(name: RequiredMediaStorageVariable) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required media storage environment variable: ${name}`);
  }

  return value;
}

export function getMediaStorageConfig(): MediaStorageConfig {
  const endpoint = requiredEnvironmentVariable("MEDIA_S3_ENDPOINT");

  try {
    new URL(endpoint);
  } catch {
    throw new Error("MEDIA_S3_ENDPOINT must be an absolute URL.");
  }

  return {
    accessKeyId: requiredEnvironmentVariable("MEDIA_S3_ACCESS_KEY_ID"),
    bucket: requiredEnvironmentVariable("MEDIA_S3_BUCKET"),
    endpoint,
    region: process.env.MEDIA_S3_REGION?.trim() || "garage",
    secretAccessKey: requiredEnvironmentVariable("MEDIA_S3_SECRET_ACCESS_KEY"),
  };
}
