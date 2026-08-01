import type { FormEventHandler } from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/features/auth/auth-form-styles";

type TotpStepProps = {
  email: string;
  message: string;
  pending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUseRecoveryCode: () => void;
};

export function TotpStep({
  email,
  message,
  pending,
  onSubmit,
  onUseRecoveryCode,
}: TotpStepProps) {
  return (
    <form className="mt-10" onSubmit={onSubmit}>
      <div className="rounded-md border border-border bg-surface-muted p-4">
        <p className="m-0 text-sm leading-body text-foreground">
          两步验证已启用。请输入认证应用为账户
          <span className="font-medium"> {email} </span>
          生成的 6 位验证码。
        </p>
      </div>

      <div className="mt-6">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="totp-code"
          lang="en"
        >
          Authentication code
        </label>
        <input
          autoComplete="one-time-code"
          className={authInputClassName}
          id="totp-code"
          inputMode="numeric"
          maxLength={6}
          name="totp-code"
          pattern="[0-9]{6}"
          placeholder="000000"
          required
          spellCheck={false}
          type="text"
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
        disabled={pending}
        type="submit"
      >
        {pending ? "正在验证…" : "验证"}
      </button>

      <div className="mt-6 text-center">
        <button
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
          onClick={onUseRecoveryCode}
          type="button"
        >
          使用恢复码
        </button>
      </div>
    </form>
  );
}
