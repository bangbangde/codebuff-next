import process from "node:process";

import { objectStorageBuckets } from "../../lib/object-storage/schema.mjs";

type GarageKeyListEntry = {
  id: string;
  name?: string;
};

type GarageKeyInfo = {
  secretAccessKey?: string;
};

type GarageBucketListEntry = {
  id: string;
  globalAliases?: string[];
};

type GarageBucketInfo = {
  id: string;
};

type GarageAdminRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST";
};

const garageAdminRequestTimeoutMs = 15_000;
const garageAccessKeyIdPattern = /^GK[0-9a-f]{24,64}$/;
const garageSecretAccessKeyPattern = /^[0-9a-f]{64}$/;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function garageAdminBaseUrl(): URL {
  const endpoint = new URL(requiredEnvironmentVariable("GARAGE_ADMIN_ENDPOINT"));

  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new Error("GARAGE_ADMIN_ENDPOINT must use http or https");
  }

  const path = endpoint.pathname.replace(/\/+$/, "");
  endpoint.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/`;
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint;
}

function requiredBucketNames(): string[] {
  return Array.from(
    new Set(
      Object.values(objectStorageBuckets).map(({ environmentVariable }) =>
        requiredEnvironmentVariable(environmentVariable),
      ),
    ),
  );
}

function runtimeCredentials(): {
  accessKeyId: string;
  secretAccessKey: string;
} {
  const accessKeyId = requiredEnvironmentVariable(
    "OBJECT_STORAGE_ACCESS_KEY_ID",
  );
  const secretAccessKey = requiredEnvironmentVariable(
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  );

  if (!garageAccessKeyIdPattern.test(accessKeyId)) {
    throw new Error(
      "OBJECT_STORAGE_ACCESS_KEY_ID must be a Garage access key ID",
    );
  }
  if (!garageSecretAccessKeyPattern.test(secretAccessKey)) {
    throw new Error(
      "OBJECT_STORAGE_SECRET_ACCESS_KEY must be a 64-character lowercase hexadecimal Garage secret",
    );
  }

  return { accessKeyId, secretAccessKey };
}

function responseDescription(text: string): string {
  if (!text) {
    return "empty response";
  }

  try {
    const value = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = value.message ?? value.error;
    return typeof message === "string" ? message : "JSON error response";
  } catch {
    return text.slice(0, 300);
  }
}

async function garageAdminRequest<T>(
  path: string,
  { body, method = "GET" }: GarageAdminRequestOptions = {},
): Promise<T> {
  const url = new URL(path, garageAdminBaseUrl());
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${requiredEnvironmentVariable("GARAGE_ADMIN_TOKEN")}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
    signal: AbortSignal.timeout(garageAdminRequestTimeoutMs),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Garage Admin API ${method} ${url.pathname}${url.search} failed ` +
        `with HTTP ${response.status}: ${responseDescription(text)}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Garage Admin API ${method} ${url.pathname}${url.search} returned invalid JSON`,
      { cause: error },
    );
  }
}

function bucketIdByAlias(
  buckets: GarageBucketListEntry[],
  alias: string,
): string | undefined {
  return buckets.find((bucket) => bucket.globalAliases?.includes(alias))?.id;
}

async function ensureBucket(
  buckets: GarageBucketListEntry[],
  alias: string,
): Promise<string> {
  const existingBucketId = bucketIdByAlias(buckets, alias);
  if (existingBucketId) {
    console.info(`Garage bucket ${alias} is already configured`);
    return existingBucketId;
  }

  const bucket = await garageAdminRequest<GarageBucketInfo>("bucket", {
    body: { globalAlias: alias },
    method: "POST",
  });
  console.info(`Garage bucket ${alias} created`);
  return bucket.id;
}

async function ensureRuntimeKey(
  keys: GarageKeyListEntry[],
  accessKeyId: string,
  secretAccessKey: string,
): Promise<void> {
  if (!keys.some((key) => key.id === accessKeyId)) {
    await garageAdminRequest<GarageKeyInfo>("key/import", {
      body: {
        accessKeyId,
        name: "codebuff runtime key",
        secretAccessKey,
      },
      method: "POST",
    });
    console.info("Garage runtime key imported");
    return;
  }

  const key = await garageAdminRequest<GarageKeyInfo>(
    `key?id=${encodeURIComponent(accessKeyId)}&showSecretKey=true`,
  );
  if (key.secretAccessKey !== secretAccessKey) {
    throw new Error(
      "OBJECT_STORAGE_SECRET_ACCESS_KEY does not match the existing Garage key",
    );
  }
  console.info("Garage runtime key is already configured");
}

async function reconcileRuntimePermissions(
  bucketId: string,
  bucketAlias: string,
  accessKeyId: string,
): Promise<void> {
  await garageAdminRequest(`bucket/allow`, {
    body: {
      accessKeyId,
      bucketId,
      permissions: { owner: false, read: true, write: true },
    },
    method: "POST",
  });
  await garageAdminRequest(`bucket/deny`, {
    body: {
      accessKeyId,
      bucketId,
      permissions: { owner: true, read: false, write: false },
    },
    method: "POST",
  });
  console.info(`Garage runtime permissions reconciled for ${bucketAlias}`);
}

export async function initializeGarage(): Promise<void> {
  const runtime = runtimeCredentials();
  const keys = await garageAdminRequest<GarageKeyListEntry[]>("key?list");

  await ensureRuntimeKey(keys, runtime.accessKeyId, runtime.secretAccessKey);

  await garageAdminRequest(
    `key?id=${encodeURIComponent(runtime.accessKeyId)}`,
    {
      body: { deny: { createBucket: true } },
      method: "POST",
    },
  );

  const buckets = await garageAdminRequest<GarageBucketListEntry[]>(
    "bucket?list",
  );

  for (const bucketAlias of requiredBucketNames()) {
    const bucketId = await ensureBucket(buckets, bucketAlias);
    await reconcileRuntimePermissions(
      bucketId,
      bucketAlias,
      runtime.accessKeyId,
    );
  }
}
