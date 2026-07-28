"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { authClient } from "@/lib/auth/client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";
import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/app/(site)/_components/auth-form-styles";
import { RecoveryCodePanel } from "./recovery-code-panel";

type EnableStep = "idle" | "setup";

export function EnableTotpFlow() {
  const router = useRouter();
  const passwordInputId = useId();
  const codeInputId = useId();
  const savedCheckboxId = useId();

  const [step, setStep] = useState<EnableStep>("idle");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [codesSaved, setCodesSaved] = useState(false);

  async function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.enable({ password });

      if (result.error) {
        setMessage("密码不正确，请重试。");
        return;
      }

      const data = result.data as {
        totpURI: string;
        backupCodes: string[];
      } | null;

      if (!data) {
        setMessage("暂时无法启用，请稍后重试。");
        return;
      }

      let dataUrl: string;

      try {
        dataUrl = await QRCode.toDataURL(data.totpURI, {
          width: 200,
          margin: 1,
          color: { dark: "#181512", light: "#ffffff" },
        });
      } catch {
        setMessage("二维码生成失败，请重试。");
        return;
      }

      setBackupCodes(data.backupCodes);
      setQrDataUrl(dataUrl);
      setCodesSaved(false);
      setStep("setup");
    } catch {
      setMessage("暂时无法启用，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim();

    try {
      const result = await authClient.twoFactor.verifyTotp({ code });

      if (result.error) {
        setMessage("验证码不正确，请重试。");
        return;
      }

      router.refresh();
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "setup") {
    return (
      <div>
        <p className="mt-3 text-sm leading-body text-muted-foreground">
          使用认证应用扫描二维码，然后输入生成的 6 位验证码完成设置。
        </p>

        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="TOTP QR code"
            className="rounded-lg border border-border"
            height={200}
            src={qrDataUrl}
            width={200}
          />
        </div>

        {backupCodes.length > 0 && (
          <RecoveryCodePanel codes={backupCodes} />
        )}

        <form className="mt-6" onSubmit={handleVerify}>
          <div>
            <label
              className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
              htmlFor={codeInputId}
              lang="en"
            >
              Verification code
            </label>
            <input
              autoComplete="one-time-code"
              className={authInputClassName}
              id={codeInputId}
              inputMode="numeric"
              maxLength={6}
              name="code"
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              spellCheck={false}
              type="text"
            />
          </div>

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
              我已将恢复码保存到安全位置。
            </label>
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
            disabled={isPending || !codesSaved}
            type="submit"
          >
            {isPending ? "Verifying…" : "Confirm and enable"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-3 text-sm leading-body text-muted-foreground">
        启用两步验证后，登录时需要输入认证应用生成的验证码。
      </p>

      <form className="mt-6" onSubmit={handleEnable}>
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
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Setting up…" : "Enable TOTP"}
        </button>
      </form>
    </div>
  );
}
