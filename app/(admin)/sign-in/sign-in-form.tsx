"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";
import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "../_components/auth-form-styles";

type Step = "credentials" | "totp" | "backup";
type TwoFactorMethod = Exclude<Step, "credentials">;
type AuthClientError = {
  code?: string;
};

type TwoFactorFailure = {
  message: string;
  restartCredentials: boolean;
};

function getTwoFactorFailure(
  error: AuthClientError,
  method: TwoFactorMethod,
): TwoFactorFailure {
  switch (error.code) {
    case "INVALID_TWO_FACTOR_COOKIE":
      return {
        message: "登录验证已过期，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
      return {
        message: "验证尝试次数过多，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "ACCOUNT_TEMPORARILY_LOCKED":
      return {
        message: "账户因多次验证失败被暂时锁定，请稍后重新登录。",
        restartCredentials: true,
      };
    case "TOTP_NOT_ENABLED":
    case "BACKUP_CODES_NOT_ENABLED":
    case "TWO_FACTOR_NOT_ENABLED":
      return {
        message: "两步验证状态已变化，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "INVALID_BACKUP_CODE":
      return {
        message: "恢复码无效或已使用，请核对后重试。",
        restartCredentials: false,
      };
    case "INVALID_CODE":
      return {
        message: "验证码不正确，请重试。",
        restartCredentials: false,
      };
    default:
      return {
        message:
          method === "backup"
            ? "暂时无法验证恢复码，请稍后重试。"
            : "暂时无法验证验证码，请稍后重试。",
        restartCredentials: false,
      };
  }
}

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  function completeSignIn(recoveryCodeUsed = false) {
    router.replace(recoveryCodeUsed ? "/account?recovery=1" : "/account");
    router.refresh();
  }

  function handleTwoFactorFailure(
    error: AuthClientError,
    method: TwoFactorMethod,
  ) {
    const failure = getTwoFactorFailure(error, method);

    if (failure.restartCredentials) {
      setPendingEmail("");
      setStep("credentials");
    }

    setMessage(failure.message);
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setPendingEmail(email);

    try {
      const result = await authClient.signIn.email({ email, password });
      const data = result.data as Record<string, unknown> | null;

      if (data?.twoFactorRedirect === true) {
        setStep("totp");
        return;
      }

      if (result.error) {
        setMessage("邮箱或密码不正确，请重试。");
        return;
      }

      completeSignIn();
    } catch {
      setMessage("暂时无法登录，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  async function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("totp-code") ?? "").trim();

    try {
      const result = await authClient.twoFactor.verifyTotp({ code });

      if (result.error) {
        handleTwoFactorFailure(result.error, "totp");
        return;
      }

      completeSignIn();
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  async function handleBackupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("backup-code") ?? "").trim();

    setIsPending(true);

    try {
      const result = await authClient.twoFactor.verifyBackupCode({ code });

      if (result.error) {
        handleTwoFactorFailure(result.error, "backup");
        return;
      }

      completeSignIn(true);
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "totp") {
    return (
      <form className="mt-10" onSubmit={handleTotpSubmit}>
        <div className="rounded-md border border-border bg-surface-muted p-4">
          <p className="m-0 text-sm leading-body text-foreground">
            两步验证已启用。请输入认证应用为账户
            <span className="font-medium"> {pendingEmail} </span>
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
          className="mt-5 min-h-[1.65em] text-sm text-accent"
          role="status"
        >
          {message}
        </p>

        <button
          className={authPrimaryButtonClassName}
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Verifying…" : "Verify"}
        </button>

        <div className="mt-6 text-center">
          <button
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
            onClick={() => {
              setStep("backup");
              setMessage("");
            }}
            type="button"
          >
            使用恢复码
          </button>
        </div>
      </form>
    );
  }

  if (step === "backup") {
    return (
      <form className="mt-10" onSubmit={handleBackupSubmit}>
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
          className="mt-5 min-h-[1.65em] text-sm text-accent"
          role="status"
        >
          {message}
        </p>

        <button
          className={authPrimaryButtonClassName}
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Verifying…" : "Verify recovery code"}
        </button>

        <div className="mt-6 text-center">
          <button
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
            onClick={() => {
              setStep("totp");
              setMessage("");
            }}
            type="button"
          >
            返回验证码
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="mt-10" onSubmit={handleCredentialsSubmit}>
      <div>
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="email"
          lang="en"
        >
          Email
        </label>
        <input
          autoCapitalize="none"
          autoComplete="email"
          className={authInputClassName}
          id="email"
          inputMode="email"
          maxLength={320}
          name="email"
          placeholder="you@example.com"
          required
          spellCheck={false}
          type="email"
        />
      </div>

      <div className="mt-6">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="password"
          lang="en"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className={authInputClassName}
          id="password"
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          minLength={AUTH_PASSWORD_MIN_LENGTH}
          name="password"
          required
          type="password"
        />
      </div>

      <p
        aria-live="polite"
        className="mt-5 min-h-[1.65em] text-sm text-accent"
        role="status"
      >
        {message}
      </p>

      <button
        className={authPrimaryButtonClassName}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
