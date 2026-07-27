export const AUTH_PASSKEY_NAME_MAX_LENGTH = 80;

const RP_ID_PATTERN =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

type RegistrationVerification = {
  registrationInfo?: {
    userVerified?: boolean;
  } | null;
};

type AuthenticationVerification = {
  authenticationInfo?: {
    userVerified?: boolean;
  } | null;
};

export function getPasskeyRelyingPartyId(
  baseURL: URL,
  rawValue: string | undefined,
): string {
  const value = rawValue?.trim().toLowerCase();

  if (!value) {
    throw new Error(
      "Missing required authentication environment variable: PASSKEY_RP_ID",
    );
  }

  if (!RP_ID_PATTERN.test(value)) {
    throw new Error("PASSKEY_RP_ID must be a valid hostname");
  }

  const hostname = baseURL.hostname.toLowerCase();
  const belongsToOrigin =
    hostname === value || hostname.endsWith(`.${value}`);

  if (!belongsToOrigin) {
    throw new Error(
      "PASSKEY_RP_ID must equal BETTER_AUTH_URL's hostname or be its registrable parent domain",
    );
  }

  return value;
}

export function registrationWasUserVerified(
  verification: RegistrationVerification,
): boolean {
  return verification.registrationInfo?.userVerified === true;
}

export function authenticationWasUserVerified(
  verification: AuthenticationVerification,
): boolean {
  return verification.authenticationInfo?.userVerified === true;
}

export function canRemovePasskey({
  passkeyCount,
  hasCredentialPassword,
}: {
  passkeyCount: number;
  hasCredentialPassword: boolean;
}): boolean {
  return passkeyCount > 1 || hasCredentialPassword;
}

export function requireUserVerificationInRequestOptions(
  value: unknown,
): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("challenge" in value) ||
    typeof value.challenge !== "string"
  ) {
    return null;
  }

  return {
    ...value,
    userVerification: "required",
  };
}
