import { PasskeySection } from "@/features/account/passkeys/passkey-section";
import { TotpSection } from "@/features/account/totp/totp-section";

export function SecuritySettingsSection({
  totpEnabled,
}: {
  totpEnabled: boolean;
}) {
  return (
    <>
      <section
        className="mt-10 border-t border-border pt-8 sm:mt-12 sm:pt-10"
        aria-labelledby="security-title"
      >
        <p className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">
          Security / TOTP
        </p>
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] lg:gap-12">
          <div>
            <h2
              className="max-w-[16ch] text-2xl font-semibold tracking-[-0.035em]"
              id="security-title"
            >
              两步验证
            </h2>
            <p className="mt-3 max-w-[32rem] text-sm leading-6 text-muted-foreground">
              使用 TOTP 认证应用为账户增加一层额外的登录保护。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
            <h3
              className="text-lg font-semibold tracking-[-0.025em]"
              lang="en"
            >
              {totpEnabled ? "TOTP enabled" : "TOTP not enabled"}
            </h3>
            <TotpSection enabled={totpEnabled} />
          </div>
        </div>
      </section>

      <section
        className="mt-10 border-t border-border pt-8 sm:mt-12 sm:pt-10"
        aria-labelledby="passkey-title"
      >
        <p className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">
          Security / Passkeys
        </p>
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] lg:gap-12">
          <div>
            <h2
              className="max-w-[16ch] text-2xl font-semibold tracking-[-0.035em]"
              id="passkey-title"
              lang="en"
            >
              Passkeys
            </h2>
            <p className="mt-3 max-w-[32rem] text-sm leading-6 text-muted-foreground">
              使用设备解锁、密码管理器或安全密钥登录。认证私钥始终留在你的设备或凭据提供方。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
            <PasskeySection />
          </div>
        </div>
      </section>
    </>
  );
}
