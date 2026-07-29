"use client";

import { useId, useState, type FormEvent } from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/features/auth/auth-form-styles";
import { authClient } from "@/lib/auth/client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";
import { RecoveryCodePanel } from "./recovery-code-panel";

type RegenerateStep = "idle" | "prompt" | "codes";

type RegenerateRecoveryCodesProps = {
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
};

export function RegenerateRecoveryCodes({
  disabled,
  onPendingChange,
}: RegenerateRecoveryCodesProps) {
  const passwordInputId = useId();
  const savedCheckboxId = useId();
  const [step, setStep] = useState<RegenerateStep>("idle");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    onPendingChange(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("regenerate-password") ?? "");

    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password,
      });

      if (result.error) {
        setMessage("密码不正确，请重试。");
        return;
      }

      const data = result.data as {
        status: boolean;
        backupCodes: string[];
      } | null;

      if (!data || !data.backupCodes?.length) {
        setMessage("暂时无法生成，请稍后重试。");
        return;
      }

      setCodes(data.backupCodes);
      setCodesSaved(false);
      setStep("codes");
    } catch {
      setMessage("暂时无法生成，请稍后重试。");
    } finally {
      setIsPending(false);
      onPendingChange(false);
    }
  }

  if (step === "codes") {
    return (
      <div>
        <RecoveryCodePanel codes={codes} regenerated />

        <div className="mt-5 flex items-start gap-3">
          <input
            checked={codesSaved}
            className="mt-1 h-4 w-4 shrink-0 accent-foreground"
            id={savedCheckboxId}
            onChange={(event) => setCodesSaved(event.target.checked)}
            type="checkbox"
          />
          <label
            className="text-sm leading-body text-foreground"
            htmlFor={savedCheckboxId}
          >
            我已将新恢复码保存到安全位置。
          </label>
        </div>

        <button
          className={authPrimaryButtonClassName}
          disabled={!codesSaved}
          onClick={() => {
            setStep("idle");
            setCodes([]);
            setCodesSaved(false);
            setMessage("");
          }}
          type="button"
        >
          完成
        </button>
      </div>
    );
  }

  if (step === "prompt") {
    return (
      <form className="mt-6" onSubmit={handleRegenerate}>
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
            name="regenerate-password"
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
          {isPending ? "Generating…" : "Generate new codes"}
        </button>

        <button
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          disabled={isPending}
          onClick={() => {
            setStep("idle");
            setMessage("");
          }}
          type="button"
        >
          取消
        </button>
      </form>
    );
  }

  return (
    <button
      className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-background px-5 py-3 font-mono text-sm font-medium text-foreground transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      disabled={disabled}
      onClick={() => {
        setStep("prompt");
        setMessage("");
      }}
      type="button"
    >
      重新生成恢复码
    </button>
  );
}
