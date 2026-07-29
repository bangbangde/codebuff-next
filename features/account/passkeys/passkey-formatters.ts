import {
  getAuthenticatorName,
  type Passkey,
} from "@better-auth/passkey";

export function getPasskeyLabel(passkey: Passkey): string {
  return (
    passkey.name?.trim() ||
    getAuthenticatorName(passkey.aaguid) ||
    "Unnamed passkey"
  );
}

export function getPasskeyTypeLabel(passkey: Passkey): string {
  if (passkey.deviceType === "multiDevice") {
    return passkey.backedUp ? "Synced passkey" : "Multi-device passkey";
  }

  return "Device-bound passkey";
}

export function formatPasskeyDate(value: Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
