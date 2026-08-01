import type { FormEvent } from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
} from "@/features/auth/auth-form-styles";
import { AUTH_PASSKEY_NAME_MAX_LENGTH } from "@/lib/auth/passkey-policy";
import type { AddPasskeyInput } from "./use-passkeys";

type AddPasskeyFormProps = {
  disabled: boolean;
  message: string;
  pending: boolean;
  onAdd: (input: AddPasskeyInput) => Promise<boolean>;
  onRefresh: () => Promise<void>;
};

export function AddPasskeyForm({
  disabled,
  message,
  pending,
  onAdd,
  onRefresh,
}: AddPasskeyFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    const added = await onAdd({
      name: name || undefined,
      authenticatorAttachment,
    });

    if (added) {
      form.reset();
    }
  }

  return (
    <form
      className="mt-8 border-t border-border pt-8"
      onSubmit={handleSubmit}
    >
      <h4 className="m-0 text-lg font-[540] tracking-[-0.025em]">
        添加 Passkey
      </h4>
      <div className="mt-5">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="passkey-name"
        >
          名称（可选）
        </label>
        <input
          autoComplete="off"
          className={authInputClassName}
          id="passkey-name"
          maxLength={AUTH_PASSKEY_NAME_MAX_LENGTH}
          name="passkey-name"
          placeholder="例如：笔记本电脑、手机、安全密钥"
          type="text"
        />
      </div>

      <div className="mt-5">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="authenticator-attachment"
        >
          验证器
        </label>
        <select
          className={authInputClassName}
          defaultValue=""
          id="authenticator-attachment"
          name="authenticator-attachment"
        >
          <option value="">由浏览器选择</option>
          <option value="platform">这台设备</option>
          <option value="cross-platform">安全密钥或其他设备</option>
        </select>
      </div>

      <p
        aria-live="polite"
        className="mt-5 min-h-[1.65em] text-sm leading-body text-brand-accent"
        role="status"
      >
        {message}
      </p>

      <button
        className={authPrimaryButtonClassName}
        disabled={disabled}
        type="submit"
      >
        {pending ? "正在等待 Passkey…" : "注册 Passkey"}
      </button>

      <button
        className={`${authSecondaryButtonClassName} mt-3`}
        disabled={disabled}
        onClick={() => void onRefresh()}
        type="button"
      >
        刷新列表
      </button>
    </form>
  );
}
