import type { Metadata } from "next";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { requireCurrentSession } from "@/lib/auth/session";
import { AccountProfileSection } from "./_components/account-profile-section";
import { RecoveryLoginNotice } from "./_components/recovery-login-notice";
import { SecuritySettingsSection } from "./_components/security-settings-section";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage the private account and two-factor authentication.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ recovery?: string }>;
}) {
  const session = await requireCurrentSession();
  const user = session.user;
  const params = await searchParams;
  const showRecoveryNotice =
    params?.recovery === "1" && Boolean(user.twoFactorEnabled);

  return (
    <main className="min-h-[70svh] pb-[clamp(3rem,7vw,6rem)]" id="main-content">
      <ContentContainer>
        {showRecoveryNotice && <RecoveryLoginNotice />}
        <AccountProfileSection email={user.email} name={user.name} />
        <SecuritySettingsSection
          totpEnabled={Boolean(user.twoFactorEnabled)}
        />
      </ContentContainer>
    </main>
  );
}
