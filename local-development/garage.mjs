import { updateWorkspaceGarageCredentials } from "./instance.mjs";

const requestTimeoutMs = 15_000;

function adminBaseUrl(instance) {
  return new URL(`http://127.0.0.1:${instance.ports.garageAdmin}/v1/`);
}

function responseDescription(text) {
  if (!text) {
    return "empty response";
  }

  try {
    const value = JSON.parse(text);
    return value.message || value.error || "JSON error response";
  } catch {
    return text.slice(0, 300);
  }
}

async function garageAdminRequest(
  instance,
  path,
  { body, method = "GET" } = {},
) {
  const url = new URL(path, adminBaseUrl(instance));
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${instance.secrets.garageAdminToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Garage Admin API ${method} ${url.pathname}${url.search} failed ` +
        `with HTTP ${response.status}: ${responseDescription(text)}`,
    );
  }

  return text ? JSON.parse(text) : undefined;
}

async function currentGarageRuntimeKey(instance) {
  const keys = await garageAdminRequest(instance, "key?list");
  if (!keys.some((key) => key.id === instance.secrets.garageAccessKeyId)) {
    return undefined;
  }

  return garageAdminRequest(
    instance,
    `key?id=${encodeURIComponent(
      instance.secrets.garageAccessKeyId,
    )}&showSecretKey=true`,
  );
}

export async function ensureLocalGarageRuntimeKey(instance) {
  const existingKey = await currentGarageRuntimeKey(instance);
  if (existingKey?.secretAccessKey) {
    console.info("Garage local runtime key is already configured.");
    return updateWorkspaceGarageCredentials(instance, existingKey);
  }

  const createdKey = await garageAdminRequest(instance, "key", {
    body: { name: `codebuff-${instance.instanceId}-runtime` },
    method: "POST",
  });
  console.info("Garage local runtime key created.");
  return updateWorkspaceGarageCredentials(instance, createdKey);
}
