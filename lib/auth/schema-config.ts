import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";

import { AUTH_APP_NAME } from "@/lib/auth/constants";
import {
  createEmailAndPasswordPolicy,
  createTwoFactorPlugin,
} from "@/lib/auth/policy";

/**
 * Schema-generation input only. Do not mount this Better Auth instance as an
 * application handler. Runtime auth configuration lives in runtime.ts and
 * injects the database, secrets, origin, and security policy.
 *
 * The pinned passkey plugin exposes the registration preference below, but
 * v1.6.23 does not yet enforce user verification during authentication.
 * Runtime integration must resolve that gap before exposing passkey endpoints.
 */
export const auth = betterAuth({
  appName: AUTH_APP_NAME,
  baseURL: "http://localhost:3000",
  emailAndPassword: createEmailAndPasswordPolicy(),
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
  },
  plugins: [
    createTwoFactorPlugin(),
    passkey({
      rpID: "localhost",
      rpName: AUTH_APP_NAME,
      origin: "http://localhost:3000",
      registration: {
        requireSession: true,
      },
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    }),
  ],
});
