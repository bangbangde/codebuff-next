"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { authClient } from "@/lib/auth/client";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-base text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-[border-color,box-shadow] duration-150 ease-[ease] placeholder:text-muted-foreground/70 hover:border-[color-mix(in_srgb,var(--foreground)_24%,var(--border))] focus:border-accent focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] motion-reduce:transition-none";

const buttonClassName =
  "mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

type EnableStep = "idle" | "setup";

export function TotpSection({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <DisableSection />;
  }

  return <EnableSection />;
}

function EnableSection() {
  const router = useRouter();
  const [step, setStep] = useState<EnableStep>("idle");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");

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

      const data = result.data as { totpURI: string; backupCodes: string[] } | null;

      if (!data) {
        setMessage("暂时无法启用，请稍后重试。");
        return;
      }

      const dataUrl = await QRCode.toDataURL(data.totpURI, {
        width: 200,
        margin: 1,
        color: { dark: "#181512", light: "#ffffff" },
      });

      setBackupCodes(data.backupCodes);
      setQrDataUrl(dataUrl);
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
          <div className="mt-6 rounded-md border border-border bg-surface-muted p-4">
            <p
              className="m-0 font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
              lang="en"
            >
              Backup codes
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              请妥善保存以下恢复码。丢失认证设备时可用它们恢复访问。
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">
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
              htmlFor="totp-code"
              lang="en"
            >
              Verification code
            </label>
            <input
              autoComplete="one-time-code"
              className={inputClassName}
              id="totp-code"
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

          <p
            aria-live="polite"
            className="mt-5 min-h-[1.65em] text-sm text-accent"
            role="status"
          >
            {message}
          </p>

          <button className={buttonClassName} disabled={isPending} type="submit">
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
            htmlFor="enable-password"
            lang="en"
          >
            Current password
          </label>
          <input
            autoComplete="current-password"
            className={inputClassName}
            id="enable-password"
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
            htmlFor="disable-password"
            lang="en"
          >
            Current password
          </label>
          <input
            autoComplete="current-password"
            className={inputClassName}
            id="disable-password"
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
