import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

/**
 * Schema-generation input only. Do not mount this Better Auth instance as an
 * application handler. Runtime auth configuration belongs to a later work
 * item and must inject its own database, secret, origin, and callbacks.
 *
 * M006 requires user verification for passkeys. The pinned passkey plugin
 * exposes the registration preference below, but v1.6.23 does not yet enforce
 * UV during authentication verification. Runtime integration must resolve
 * that gap before exposing passkey endpoints.
 */
export const auth = betterAuth({
  appName: "CQ's Lab",
  baseURL: "http://localhost:3000",
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
  },
  plugins: [
    twoFactor({
      issuer: "CQ's Lab",
      skipVerificationOnEnable: false,
      allowPasswordless: false,
      backupCodeOptions: {
        storeBackupCodes: "encrypted",
        allowPasswordless: false,
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 10,
        durationSeconds: 15 * 60,
      },
    }),
    passkey({
      rpID: "localhost",
      rpName: "CQ's Lab",
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
