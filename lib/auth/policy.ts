import { twoFactor } from "better-auth/plugins";

import {
  AUTH_APP_NAME,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";

export function createEmailAndPasswordPolicy() {
  return {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
    maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
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
