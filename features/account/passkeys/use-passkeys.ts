"use client";

import { useCallback, useEffect, useState } from "react";
import type { Passkey } from "@better-auth/passkey";

import { authClient } from "@/lib/auth/client";
import { AUTH_PASSKEY_NAME_MAX_LENGTH } from "@/lib/auth/passkey-policy";

type AuthClientError = {
  code?: string;
};

type PasskeyAction = "add" | "rename" | "delete";

export type PasskeyPendingAction =
  | "add"
  | `rename:${string}`
  | `delete:${string}`;

export type AddPasskeyInput = {
  name?: string;
  authenticatorAttachment?: "platform" | "cross-platform";
};

function getPasskeyFailureMessage(
  error: AuthClientError,
  action: PasskeyAction,
): string {
  switch (error.code) {
    case "SESSION_NOT_FRESH":
    case "SESSION_EXPIRED":
      return "当前登录已超过 10 分钟。请退出并重新登录后再更改 Passkey。";
    case "ERROR_CEREMONY_ABORTED":
    case "REGISTRATION_CANCELLED":
      return "Passkey 注册已取消。";
    case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
    case "PREVIOUSLY_REGISTERED":
      return "这个 Passkey 已经注册过。";
    case "LAST_AUTHENTICATOR":
      return "无法移除账户最后一个可用的登录方式。";
    case "PASSKEY_NAME_TOO_LONG":
      return `名称最多 ${AUTH_PASSKEY_NAME_MAX_LENGTH} 个字符。`;
    default:
      if (action === "rename") {
        return "暂时无法更新 Passkey 名称，请稍后重试。";
      }

      if (action === "delete") {
        return "暂时无法移除 Passkey，请稍后重试。";
      }

      return "暂时无法注册 Passkey，请稍后重试。";
  }
}

export function usePasskeys() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] =
    useState<PasskeyPendingAction | null>(null);
  const [message, setMessage] = useState("");

  const loadPasskeys = useCallback(async () => {
    const result = await authClient.passkey.listUserPasskeys();

    if (result.error) {
      throw new Error("Unable to load passkeys");
    }

    setPasskeys(result.data ?? []);
  }, []);

  useEffect(() => {
    let isActive = true;

    void authClient.passkey
      .listUserPasskeys()
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.error) {
          throw new Error("Unable to load passkeys");
        }

        setPasskeys(result.data ?? []);
      })
      .catch(() => {
        if (isActive) {
          setMessage("暂时无法读取 Passkey，请刷新页面后重试。");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function addPasskey(input: AddPasskeyInput): Promise<boolean> {
    if (!("PublicKeyCredential" in window)) {
      setMessage("当前浏览器或设备不支持 Passkey。");
      return false;
    }

    setPendingAction("add");
    setMessage("");

    try {
      const result = await authClient.passkey.addPasskey(input);

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(result.error as AuthClientError, "add"),
        );
        return false;
      }

      await loadPasskeys();
      setMessage("Passkey 已注册，可以用于下次登录。");
      return true;
    } catch {
      setMessage("暂时无法注册 Passkey，请稍后重试。");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function renamePasskey(id: string, name: string): Promise<boolean> {
    const nextName = name.trim();

    if (!nextName) {
      setMessage("请输入 Passkey 名称。");
      return false;
    }

    setPendingAction(`rename:${id}`);
    setMessage("");

    try {
      const result = await authClient.passkey.updatePasskey({
        id,
        name: nextName,
      });

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(result.error as AuthClientError, "rename"),
        );
        return false;
      }

      await loadPasskeys();
      setMessage("Passkey 名称已更新。");
      return true;
    } catch {
      setMessage("暂时无法更新 Passkey 名称，请稍后重试。");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function deletePasskey(id: string): Promise<boolean> {
    setPendingAction(`delete:${id}`);
    setMessage("");

    try {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(result.error as AuthClientError, "delete"),
        );
        return false;
      }

      await loadPasskeys();
      setMessage("Passkey 已移除。");
      return true;
    } catch {
      setMessage("暂时无法移除 Passkey，请稍后重试。");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function refreshPasskeys() {
    try {
      await loadPasskeys();
    } catch {
      setMessage("暂时无法读取 Passkey，请刷新页面后重试。");
    }
  }

  return {
    addPasskey,
    clearMessage: () => setMessage(""),
    deletePasskey,
    isBusy: pendingAction !== null,
    isLoading,
    message,
    passkeys,
    pendingAction,
    refreshPasskeys,
    renamePasskey,
  };
}
