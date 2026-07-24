import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

import { getDatabase } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);

function getBaseURL(): URL {
  const rawValue = process.env.BETTER_AUTH_URL?.trim();

  if (!rawValue) {
    throw new Error("Missing required authentication environment variable: BETTER_AUTH_URL");
  }

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL");
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("BETTER_AUTH_URL must contain only an origin");
  }

  const isSecureOrigin = url.protocol === "https:";
  const isLocalOrigin =
    url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname);

  if (!isSecureOrigin && !isLocalOrigin) {
    throw new Error(
      "BETTER_AUTH_URL must use HTTPS unless it targets the local machine",
    );
  }

  return url;
}

function getVersionedSecrets(): Array<{ version: number; value: string }> {
  const rawValue = process.env.BETTER_AUTH_SECRETS?.trim();

  if (!rawValue) {
    throw new Error(
      "Missing required authentication environment variable: BETTER_AUTH_SECRETS",
    );
  }

  const seenVersions = new Set<number>();
  const secrets = rawValue.split(",").map((entry) => {
    const separatorIndex = entry.indexOf(":");

    if (separatorIndex <= 0) {
      throw new Error("BETTER_AUTH_SECRETS has an invalid entry");
    }

    const rawVersion = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    const version = Number(rawVersion);

    if (
      !/^\d+$/.test(rawVersion) ||
      !Number.isSafeInteger(version) ||
      version < 0 ||
      value.length < 32 ||
      seenVersions.has(version)
    ) {
      throw new Error("BETTER_AUTH_SECRETS has an invalid entry");
    }

    seenVersions.add(version);

    return { version, value };
  });

  if (secrets.length === 0) {
    throw new Error("BETTER_AUTH_SECRETS must contain at least one entry");
  }

  return secrets;
}

function createRuntimeAuth() {
  const baseURL = getBaseURL();

  return betterAuth({
    appName: "CQ's Lab",
    baseURL: baseURL.origin,
    secrets: getVersionedSecrets(),
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 15,
      maxPasswordLength: 128,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 5,
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: "CQ's Lab",
        skipVerificationOnEnable: false,
        allowPasswordless: false,
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 10,
          durationSeconds: 15 * 60,
        },
      }),
    ],
    trustedOrigins: [baseURL.origin],
    advanced: {
      useSecureCookies: baseURL.protocol === "https:",
      trustedProxyHeaders: false,
      cookiePrefix: "cq-lab",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: baseURL.protocol === "https:",
        path: "/",
      },
    },
    telemetry: {
      enabled: false,
    },
  });
}

type RuntimeAuth = ReturnType<typeof createRuntimeAuth>;

const authGlobals = globalThis as typeof globalThis & {
  codebuffRuntimeAuth?: RuntimeAuth;
};

export function getRuntimeAuth(): RuntimeAuth {
  authGlobals.codebuffRuntimeAuth ??= createRuntimeAuth();

  return authGlobals.codebuffRuntimeAuth;
}
