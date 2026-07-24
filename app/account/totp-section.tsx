"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { authClient } from "@/lib/auth/client";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-base text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-[border-color,box-shadow] duration-150 ease-[ease] placeholder:text-muted-foreground/70 hover:border-[color-mix(in_srgb,var(--foreground)_24%,var(--border))] focus:border-accent focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] motion-reduce:transition-none";

const buttonClassName =
  "mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

const warningBoxClassName =
  "rounded-md border border-border bg-surface-muted p-4";

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
          <div className={warningBoxClassName}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-background">
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="m-0 font-medium text-foreground"
                  lang="en"
                >
                  Save your recovery codes
                </p>
                <p className="m-0 mt-1 text-sm leading-body text-muted-foreground">
                  在继续之前，请将恢复码保存到安全位置。这是你唯一一次可以查看它们。
                  如果丢失认证设备且没有恢复码，将无法恢复账户访问。
                </p>
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-4 font-mono text-sm">
              {backupCodes.map((code) => (
                <li key={code} className="text-foreground">
                  {code}
                </li>
              ))}
            </ul>
          </div>
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
              className={inputClassName}
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
            className={buttonClassName}
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
            className={inputClassName}
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

        <button className={buttonClassName} disabled={isPending} type="submit">
          {isPending ? "Setting up…" : "Enable TOTP"}
        </button>
      </form>
    </div>
  );
}

function DisableSection() {
  const router = useRouter();
  const passwordInputId = useId();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
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
    }
  }

  return (
    <div>
      <p className="mt-3 text-sm leading-body text-muted-foreground">
        两步验证已启用。禁用后登录将仅需要密码。
      </p>

      <form className="mt-6" onSubmit={handleDisable}>
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
            className={inputClassName}
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

        <button className={buttonClassName} disabled={isPending} type="submit">
          {isPending ? "Disabling…" : "Disable TOTP"}
        </button>
      </form>
    </div>
  );
}
