import type { FormEventHandler } from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/app/(site)/_components/auth-form-styles";

type RecoveryCodeStepProps = {
  message: string;
  pending: boolean;
  onBackToTotp: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function RecoveryCodeStep({
  message,
  pending,
  onBackToTotp,
  onSubmit,
}: RecoveryCodeStepProps) {
  return (
    <form className="mt-10" onSubmit={onSubmit}>
      <div className="rounded-md border border-border bg-surface-muted p-4">
        <p className="m-0 text-sm leading-body text-foreground">
          输入任意一枚未使用的恢复码以完成登录。每枚只能使用一次。
        </p>
      </div>

      <div className="mt-6">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="backup-code"
          lang="en"
        >
          Recovery code
        </label>
        <input
          autoComplete="off"
          className={authInputClassName}
          id="backup-code"
          name="backup-code"
          placeholder="xxxxx-xxxxx"
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
        {pending ? "Verifying…" : "Verify recovery code"}
      </button>

      <div className="mt-6 text-center">
        <button
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
          onClick={onBackToTotp}
          type="button"
        >
          返回验证码
        </button>
      </div>
    </form>
  );
}
