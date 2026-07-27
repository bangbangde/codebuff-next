export type SignInStep = "credentials" | "totp" | "recovery";

export type TwoFactorMethod = Exclude<SignInStep, "credentials">;

export type SignInPendingAction = SignInStep | "passkey";

export type AuthClientError = {
  code?: string;
};

export type TwoFactorFailure = {
  message: string;
  restartCredentials: boolean;
};
