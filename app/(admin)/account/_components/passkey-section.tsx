"use client";

import {
  getAuthenticatorName,
  type Passkey,
} from "@better-auth/passkey";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
} from "@/app/(admin)/_components/auth-form-styles";
import { authClient } from "@/lib/auth/client";
import { AUTH_PASSKEY_NAME_MAX_LENGTH } from "@/lib/auth/passkey-policy";

type AuthClientError = {
  code?: string;
};

function getPasskeyFailureMessage(
  error: AuthClientError,
  action: "add" | "rename" | "delete",
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

function getPasskeyLabel(passkey: Passkey): string {
  return (
    passkey.name?.trim() ||
    getAuthenticatorName(passkey.aaguid) ||
    "Unnamed passkey"
  );
}

function getPasskeyTypeLabel(passkey: Passkey): string {
  if (passkey.deviceType === "multiDevice") {
    return passkey.backedUp ? "Synced passkey" : "Multi-device passkey";
  }

  return "Device-bound passkey";
}

function formatPasskeyDate(value: Date): string {
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

export function PasskeySection() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );

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

  async function handleAddPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!("PublicKeyCredential" in window)) {
      setMessage("当前浏览器或设备不支持 Passkey。");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("passkey-name") ?? "").trim();
    const attachmentValue = String(
      formData.get("authenticator-attachment") ?? "",
    );
    const authenticatorAttachment =
      attachmentValue === "platform" || attachmentValue === "cross-platform"
        ? attachmentValue
        : undefined;

    setPendingAction("add");
    setMessage("");

    try {
      const result = await authClient.passkey.addPasskey({
        name: name || undefined,
        authenticatorAttachment,
      });

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(
            result.error as AuthClientError,
            "add",
          ),
        );
        return;
      }

      await loadPasskeys();
      form.reset();
      setMessage("Passkey 已注册，可以用于下次登录。");
    } catch {
      setMessage("暂时无法注册 Passkey，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRenamePasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const name = editingName.trim();

    if (!name) {
      setMessage("请输入 Passkey 名称。");
      return;
    }

    setPendingAction(`rename:${editingId}`);
    setMessage("");

    try {
      const result = await authClient.passkey.updatePasskey({
        id: editingId,
        name,
      });

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(
            result.error as AuthClientError,
            "rename",
          ),
        );
        return;
      }

      await loadPasskeys();
      setEditingId(null);
      setEditingName("");
      setMessage("Passkey 名称已更新。");
    } catch {
      setMessage("暂时无法更新 Passkey 名称，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeletePasskey(id: string) {
    setPendingAction(`delete:${id}`);
    setMessage("");

    try {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result.error) {
        setMessage(
          getPasskeyFailureMessage(
            result.error as AuthClientError,
            "delete",
          ),
        );
        return;
      }

      await loadPasskeys();
      setDeleteCandidateId(null);
      setMessage("Passkey 已移除。");
    } catch {
      setMessage("暂时无法移除 Passkey，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  const isBusy = pendingAction !== null;

  return (
    <div aria-busy={isLoading || isBusy}>
      <div>
        <h3
          className="m-0 text-[1.5rem] font-[540] tracking-[-0.035em]"
          lang="en"
        >
          Registered passkeys
        </h3>
        <p className="mt-3 text-sm leading-body text-muted-foreground">
          注册、重命名和移除需要最近 10 分钟内建立的登录 Session。
        </p>
      </div>

      <div className="mt-7 border-t border-border pt-7">
        {isLoading ? (
          <p className="m-0 text-sm text-muted-foreground">
            Loading passkeys…
          </p>
        ) : passkeys.length === 0 ? (
          <p className="m-0 rounded-md border border-dashed border-border bg-background p-4 text-sm leading-body text-muted-foreground">
            还没有注册 Passkey。密码和 TOTP 登录方式不会因注册 Passkey
            而改变。
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border p-0">
            {passkeys.map((passkey) => {
              const label = getPasskeyLabel(passkey);
              const isEditing = editingId === passkey.id;
              const isConfirmingDelete =
                deleteCandidateId === passkey.id;

              return (
                <li className="py-5 first:pt-0 last:pb-0" key={passkey.id}>
                  <div className="flex items-start justify-between gap-5 [@media(max-width:28rem)]:flex-col">
                    <div className="min-w-0">
                      <p className="m-0 break-words font-medium text-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        <span lang="en">{getPasskeyTypeLabel(passkey)}</span>
                        {" · "}
                        注册于 {formatPasskeyDate(passkey.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3">
                      <button
                        className="min-h-10 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-medium text-foreground transition-[border-color,color] hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(passkey.id);
                          setEditingName(label);
                          setDeleteCandidateId(null);
                          setMessage("");
                        }}
                        type="button"
                      >
                        Rename
                      </button>
                      <button
                        className="min-h-10 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-medium text-muted-foreground transition-[border-color,color] hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                        disabled={isBusy}
                        onClick={() => {
                          setDeleteCandidateId(passkey.id);
                          setEditingId(null);
                          setMessage("");
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <form
                      className="mt-5 rounded-md border border-border bg-background p-4"
                      onSubmit={handleRenamePasskey}
                    >
                      <label
                        className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
                        htmlFor={`passkey-name-${passkey.id}`}
                        lang="en"
                      >
                        Passkey name
                      </label>
                      <input
                        autoComplete="off"
                        className={authInputClassName}
                        id={`passkey-name-${passkey.id}`}
                        maxLength={AUTH_PASSKEY_NAME_MAX_LENGTH}
                        onChange={(event) =>
                          setEditingName(event.currentTarget.value)
                        }
                        required
                        type="text"
                        value={editingName}
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          className="min-h-10 rounded-md bg-foreground px-4 py-2 font-mono text-xs font-medium text-background transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none"
                          disabled={isBusy}
                          type="submit"
                        >
                          {pendingAction === `rename:${passkey.id}`
                            ? "Saving…"
                            : "Save"}
                        </button>
                        <button
                          className="min-h-10 rounded-md px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                          disabled={isBusy}
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {isConfirmingDelete && (
                    <div
                      className="mt-5 rounded-md border border-accent/30 bg-accent/10 p-4"
                      role="alert"
                    >
                      <p className="m-0 text-sm leading-body text-foreground">
                        从账户移除 “{label}”？设备或密码管理器中的凭据需要另行删除。
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          className="min-h-10 rounded-md bg-accent px-4 py-2 font-mono text-xs font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50"
                          disabled={isBusy}
                          onClick={() => handleDeletePasskey(passkey.id)}
                          type="button"
                        >
                          {pendingAction === `delete:${passkey.id}`
                            ? "Removing…"
                            : "Remove passkey"}
                        </button>
                        <button
                          className="min-h-10 rounded-md px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                          disabled={isBusy}
                          onClick={() => setDeleteCandidateId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        className="mt-8 border-t border-border pt-8"
        onSubmit={handleAddPasskey}
      >
        <h4
          className="m-0 text-lg font-[540] tracking-[-0.025em]"
          lang="en"
        >
          Add a passkey
        </h4>
        <div className="mt-5">
          <label
            className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
            htmlFor="passkey-name"
            lang="en"
          >
            Name (optional)
          </label>
          <input
            autoComplete="off"
            className={authInputClassName}
            id="passkey-name"
            maxLength={AUTH_PASSKEY_NAME_MAX_LENGTH}
            name="passkey-name"
            placeholder="Laptop, phone, security key…"
            type="text"
          />
        </div>

        <div className="mt-5">
          <label
            className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
            htmlFor="authenticator-attachment"
            lang="en"
          >
            Authenticator
          </label>
          <select
            className={authInputClassName}
            defaultValue=""
            id="authenticator-attachment"
            name="authenticator-attachment"
          >
            <option value="">Let the browser choose</option>
            <option value="platform">This device</option>
            <option value="cross-platform">Security key or another device</option>
          </select>
        </div>

        <p
          aria-live="polite"
          className="mt-5 min-h-[1.65em] text-sm leading-body text-accent"
          role="status"
        >
          {message}
        </p>

        <button
          className={authPrimaryButtonClassName}
          disabled={isBusy}
          type="submit"
        >
          {pendingAction === "add"
            ? "Waiting for passkey…"
            : "Register passkey"}
        </button>

        <button
          className={`${authSecondaryButtonClassName} mt-3`}
          disabled={isBusy}
          onClick={() => {
            void loadPasskeys().catch(() => {
              setMessage("暂时无法读取 Passkey，请刷新页面后重试。");
            });
          }}
          type="button"
        >
          Refresh list
        </button>
      </form>
    </div>
  );
}
