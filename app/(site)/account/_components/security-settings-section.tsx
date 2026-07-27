import { SectionLabel } from "@/app/(site)/_components/section-label";
import { PasskeySection } from "./passkeys/passkey-section";
import { TotpSection } from "./totp/totp-section";

export function SecuritySettingsSection({
  totpEnabled,
}: {
  totpEnabled: boolean;
}) {
  return (
    <>
      <section
        className="pt-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="security-title"
      >
        <SectionLabel>Private / Security</SectionLabel>
        <div className="mt-6 grid grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] items-start gap-[clamp(3rem,8vw,8rem)] [@media(max-width:46rem)]:grid-cols-1 [@media(max-width:46rem)]:gap-10">
          <div>
            <h2
              className="m-0 max-w-[16ch] text-[1.75rem] font-[520] leading-tight tracking-[-0.035em]"
              id="security-title"
            >
              两步验证
            </h2>
            <p className="mt-5 max-w-[32rem] text-lg leading-body text-muted-foreground">
              使用 TOTP 认证应用为账户增加一层额外的登录保护。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-[clamp(1.5rem,4vw,2.5rem)]">
            <h3
              className="m-0 text-[1.5rem] font-[540] tracking-[-0.035em]"
              lang="en"
            >
              {totpEnabled ? "TOTP enabled" : "TOTP not enabled"}
            </h3>
            <TotpSection enabled={totpEnabled} />
          </div>
        </div>
      </section>

      <section
        className="mt-[clamp(4rem,8vw,7rem)] border-t border-border pt-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="passkey-title"
      >
        <SectionLabel>Private / Passkeys</SectionLabel>
        <div className="mt-6 grid grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] items-start gap-[clamp(3rem,8vw,8rem)] [@media(max-width:46rem)]:grid-cols-1 [@media(max-width:46rem)]:gap-10">
          <div>
            <h2
              className="m-0 max-w-[16ch] text-[1.75rem] font-[520] leading-tight tracking-[-0.035em]"
              id="passkey-title"
              lang="en"
            >
              Passkeys
            </h2>
            <p className="mt-5 max-w-[32rem] text-lg leading-body text-muted-foreground">
              使用设备解锁、密码管理器或安全密钥登录。认证私钥始终留在你的设备或凭据提供方。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-[clamp(1.5rem,4vw,2.5rem)]">
            <PasskeySection />
          </div>
        </div>
      </section>
    </>
  );
}
