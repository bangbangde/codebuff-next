"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-base text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-[border-color,box-shadow] duration-150 ease-[ease] placeholder:text-muted-foreground/70 hover:border-[color-mix(in_srgb,var(--foreground)_24%,var(--border))] focus:border-accent focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] motion-reduce:transition-none";

type Step = "credentials" | "totp" | "backup";

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

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

      if (data && "twoFactorRedirect" in data) {
        setStep("totp");
        return;
      }

      if (result.error) {
        setMessage("邮箱或密码不正确，请重试。");
        return;
      }

      router.replace("/account");
      router.refresh();
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
        setMessage("验证码不正确，请重试。");
        return;
      }

      router.replace("/account");
      router.refresh();
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  async function handleBackupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("backup-code") ?? "").trim();

    try {
      const result = await authClient.twoFactor.verifyBackupCode({ code });

      if (result.error) {
        setMessage("恢复码不正确，请重试。");
        return;
      }

      router.replace("/account");
      router.refresh();
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
            className={inputClassName}
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
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
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
            输入你的恢复码以完成登录。每个恢复码只能使用一次。
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
            className={inputClassName}
            id="backup-code"
            name="backup-code"
            placeholder="xxxxxxxxxx"
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
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
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
          className={inputClassName}
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
          className={inputClassName}
          id="password"
          maxLength={128}
          minLength={15}
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
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
