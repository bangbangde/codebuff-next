import "server-only";

import {
  getAuthenticatorName,
  PASSKEY_ERROR_CODES,
  passkey,
} from "@better-auth/passkey";
import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  freshSessionMiddleware,
} from "better-auth/api";

import { AUTH_APP_NAME } from "@/lib/auth/constants";
import {
  AUTH_PASSKEY_NAME_MAX_LENGTH,
  authenticationWasUserVerified,
  canRemovePasskey,
  getPasskeyRelyingPartyId,
  registrationWasUserVerified,
  requireUserVerificationInRequestOptions,
} from "@/lib/auth/passkey-policy";

const PASSKEY_AUTHENTICATION_OPTIONS_PATH =
  "/passkey/generate-authenticate-options";
const PASSKEY_REGISTRATION_OPTIONS_PATH =
  "/passkey/generate-register-options";
const PASSKEY_REGISTRATION_VERIFICATION_PATH =
  "/passkey/verify-registration";
const PASSKEY_UPDATE_PATH = "/passkey/update-passkey";
const PASSKEY_DELETE_PATH = "/passkey/delete-passkey";

const PASSKEY_NAME_TOO_LONG = {
  code: "PASSKEY_NAME_TOO_LONG",
  message: `Passkey names must be at most ${AUTH_PASSKEY_NAME_MAX_LENGTH} characters`,
};

const LAST_AUTHENTICATOR = {
  code: "LAST_AUTHENTICATOR",
  message: "The last usable authenticator cannot be removed",
};

async function readSuccessfulEndpointPayload(
  returned: unknown,
): Promise<unknown> {
  if (returned instanceof Response) {
    if (!returned.ok) {
      return null;
    }

    return returned.clone().json().catch(() => null);
  }

  return returned;
}

function hasStoredCredentialPassword(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "password" in value &&
    typeof value.password === "string" &&
    value.password.length > 0
  );
}

const freshPasskeyMutationMiddleware = createAuthMiddleware(
  {
    use: [freshSessionMiddleware],
  },
  async (ctx) => {
    if (ctx.path !== PASSKEY_DELETE_PATH) {
      return;
    }

    const userId = ctx.context.session.user.id;
    const [passkeys, credentialAccount] = await Promise.all([
      ctx.context.adapter.findMany({
        model: "passkey",
        where: [{ field: "userId", value: userId }],
      }),
      ctx.context.adapter.findOne({
        model: "account",
        where: [
          { field: "userId", value: userId },
          { field: "providerId", value: "credential" },
        ],
      }),
    ]);

    if (
      !canRemovePasskey({
        passkeyCount: passkeys.length,
        hasCredentialPassword: hasStoredCredentialPassword(credentialAccount),
      })
    ) {
      throw APIError.from("BAD_REQUEST", LAST_AUTHENTICATOR);
    }
  },
);

const validatePasskeyNameMiddleware = createAuthMiddleware(async (ctx) => {
  const name =
    ctx.path === PASSKEY_REGISTRATION_OPTIONS_PATH
      ? ctx.query?.name
      : ctx.body?.name;

  if (
    typeof name === "string" &&
    name.trim().length > AUTH_PASSKEY_NAME_MAX_LENGTH
  ) {
    throw APIError.from("BAD_REQUEST", PASSKEY_NAME_TOO_LONG);
  }
});

function createPasskeySecurityPlugin(): BetterAuthPlugin {
  return {
    id: "cq-lab-passkey-security",
    hooks: {
      before: [
        {
          matcher: (ctx) =>
            ctx.path === PASSKEY_UPDATE_PATH ||
            ctx.path === PASSKEY_DELETE_PATH,
          handler: freshPasskeyMutationMiddleware,
        },
        {
          matcher: (ctx) =>
            ctx.path === PASSKEY_REGISTRATION_OPTIONS_PATH ||
            ctx.path === PASSKEY_REGISTRATION_VERIFICATION_PATH ||
            ctx.path === PASSKEY_UPDATE_PATH,
          handler: validatePasskeyNameMiddleware,
        },
      ],
      after: [
        {
          matcher: (ctx) =>
            ctx.path === PASSKEY_AUTHENTICATION_OPTIONS_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            const payload = await readSuccessfulEndpointPayload(
              ctx.context.returned,
            );
            const hardenedOptions =
              requireUserVerificationInRequestOptions(payload);

            if (hardenedOptions) {
              return ctx.json(hardenedOptions);
            }
          }),
        },
      ],
    },
  };
}

export function createRuntimePasskeyPlugins(baseURL: URL) {
  const relyingPartyId = getPasskeyRelyingPartyId(
    baseURL,
    process.env.PASSKEY_RP_ID,
  );

  return [
    passkey({
      rpID: relyingPartyId,
      rpName: AUTH_APP_NAME,
      origin: baseURL.origin,
      registration: {
        requireSession: true,
        afterVerification: ({ verification }) => {
          if (!registrationWasUserVerified(verification)) {
            throw APIError.from(
              "BAD_REQUEST",
              PASSKEY_ERROR_CODES.FAILED_TO_VERIFY_REGISTRATION,
            );
          }

          const name = getAuthenticatorName(
            verification.registrationInfo?.aaguid,
          );

          return name ? { name } : undefined;
        },
      },
      authentication: {
        afterVerification: ({ verification }) => {
          if (!authenticationWasUserVerified(verification)) {
            throw APIError.from(
              "UNAUTHORIZED",
              PASSKEY_ERROR_CODES.AUTHENTICATION_FAILED,
            );
          }
        },
      },
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    }),
    createPasskeySecurityPlugin(),
  ] as const;
}
