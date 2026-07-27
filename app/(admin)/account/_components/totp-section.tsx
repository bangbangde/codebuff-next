"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { authClient } from "@/lib/auth/client";
import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "../../_components/auth-form-styles";
import { RecoveryCodePanel } from "./recovery-code-panel";

type EnableStep = "idle" | "setup";

export function TotpSection({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <DisableSection />;
  }

  return <EnableSection />;
}

function EnableSection() {
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
            className="mt-5 min-h-[1.65em] text-sm text-accent"
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

type DisableStep = "idle" | "regenerate-prompt" | "regenerate";

function DisableSection() {
  const router = useRouter();
  const passwordInputId = useId();
  const regeneratePasswordId = useId();
  const savedCheckboxId = useId();
  const [disableStep, setDisableStep] = useState<DisableStep>("idle");
  const [isDisablePending, setIsDisablePending] = useState(false);
  const [disableMessage, setDisableMessage] = useState("");
  const [isRegeneratePending, setIsRegeneratePending] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState("");
  const [regenerateCodes, setRegenerateCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDisablePending(true);
    setDisableMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.disable({ password });

      if (result.error) {
        setDisableMessage("密码不正确，请重试。");
        return;
      }

      router.refresh();
    } catch {
      setDisableMessage("暂时无法禁用，请稍后重试。");
    } finally {
      setIsDisablePending(false);
    }
  }

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRegeneratePending(true);
    setRegenerateMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("regenerate-password") ?? "");

    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password,
      });

      if (result.error) {
        setRegenerateMessage("密码不正确，请重试。");
        return;
      }

      const data = result.data as {
        status: boolean;
        backupCodes: string[];
      } | null;

      if (!data || !data.backupCodes?.length) {
        setRegenerateMessage("暂时无法生成，请稍后重试。");
        return;
      }

      setRegenerateCodes(data.backupCodes);
      setCodesSaved(false);
      setDisableStep("regenerate");
    } catch {
      setRegenerateMessage("暂时无法生成，请稍后重试。");
    } finally {
      setIsRegeneratePending(false);
    }
  }

  if (disableStep === "regenerate") {
    return (
      <div>
        <RecoveryCodePanel codes={regenerateCodes} regenerated />

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
            setDisableStep("idle");
            setRegenerateCodes([]);
            setCodesSaved(false);
            setRegenerateMessage("");
          }}
          type="button"
        >
          完成
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-3 text-sm leading-body text-muted-foreground">
        两步验证已启用。禁用后登录将仅需要密码。
      </p>

      {disableStep === "regenerate-prompt" ? (
        <form className="mt-6" onSubmit={handleRegenerate}>
          <div>
            <label
              className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
              htmlFor={regeneratePasswordId}
              lang="en"
            >
              Current password
            </label>
            <input
              autoComplete="current-password"
              className={authInputClassName}
              id={regeneratePasswordId}
              maxLength={128}
              minLength={15}
              name="regenerate-password"
              required
              type="password"
            />
          </div>

          <p
            aria-live="polite"
            className="mt-5 min-h-[1.65em] text-sm text-accent"
            role="status"
          >
            {regenerateMessage}
          </p>

          <button
            className={authPrimaryButtonClassName}
            disabled={isRegeneratePending || isDisablePending}
            type="submit"
          >
            {isRegeneratePending ? "Generating…" : "Generate new codes"}
          </button>

          <button
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
            disabled={isRegeneratePending}
            onClick={() => {
              setDisableStep("idle");
              setRegenerateMessage("");
            }}
            type="button"
          >
            取消
          </button>
        </form>
      ) : (
        <button
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-background px-5 py-3 font-mono text-sm font-medium text-foreground transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          disabled={isDisablePending}
          onClick={() => {
            setDisableStep("regenerate-prompt");
            setRegenerateMessage("");
          }}
          type="button"
        >
          重新生成恢复码
        </button>
      )}

      <div className="my-6 h-px bg-border" />

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
          {disableMessage}
        </p>

        <button
          className={authPrimaryButtonClassName}
          disabled={isDisablePending || isRegeneratePending}
          type="submit"
        >
          {isDisablePending ? "Disabling…" : "Disable TOTP"}
        </button>
      </form>
    </div>
  );
}
