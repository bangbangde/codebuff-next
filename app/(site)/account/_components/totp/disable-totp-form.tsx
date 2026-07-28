"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/app/(site)/_components/auth-form-styles";
import { authClient } from "@/lib/auth/client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";

type DisableTotpFormProps = {
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
};

export function DisableTotpForm({
  disabled,
  onPendingChange,
}: DisableTotpFormProps) {
  const router = useRouter();
  const passwordInputId = useId();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    onPendingChange(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.disable({ password });

      if (result.error) {
        setMessage("密码不正确，请重试。");
        return;
      }

      router.refresh();
    } catch {
      setMessage("暂时无法禁用，请稍后重试。");
    } finally {
      setIsPending(false);
      onPendingChange(false);
    }
  }

  return (
    <form onSubmit={handleDisable}>
      <div>
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor={passwordInputId}
          lang="en"
        >
          Current password
        </label>
        <input
          autoComplete="current-password"
          className={authInputClassName}
          id={passwordInputId}
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          minLength={AUTH_PASSWORD_MIN_LENGTH}
          name="password"
          required
          type="password"
        />
      </div>

      <p
        aria-live="polite"
        className="mt-5 min-h-[1.65em] text-sm text-brand-accent"
        role="status"
      >
        {message}
      </p>

      <button
        className={authPrimaryButtonClassName}
        disabled={disabled}
        type="submit"
      >
        {isPending ? "Disabling…" : "Disable TOTP"}
      </button>
    </form>
  );
}
