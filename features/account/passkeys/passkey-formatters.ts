import {
  getAuthenticatorName,
  type Passkey,
} from "@better-auth/passkey";

export function getPasskeyLabel(passkey: Passkey): string {
  return (
    passkey.name?.trim() ||
    getAuthenticatorName(passkey.aaguid) ||
    "未命名 Passkey"
  );
}

export function getPasskeyTypeLabel(passkey: Passkey): string {
  if (passkey.deviceType === "multiDevice") {
    return passkey.backedUp ? "已同步" : "多设备";
  }

  return "仅限当前设备";
}

export function formatPasskeyDate(value: Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日期未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
