import { twoFactor } from "better-auth/plugins";

export const AUTH_APP_NAME = "CQ's Lab";

export function createEmailAndPasswordPolicy() {
  return {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 15,
    maxPasswordLength: 128,
  };
}

export function createTwoFactorPlugin() {
  return twoFactor({
    issuer: AUTH_APP_NAME,
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
  });
}
