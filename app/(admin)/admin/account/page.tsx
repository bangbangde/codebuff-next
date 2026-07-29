import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/session";
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
  const session = await requireAdmin();
  const user = session.user;
  const params = await searchParams;
  const showRecoveryNotice =
    params?.recovery === "1" && Boolean(user.twoFactorEnabled);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      {showRecoveryNotice && <RecoveryLoginNotice />}
      <AccountProfileSection email={user.email} name={user.name} />
      <SecuritySettingsSection
        totpEnabled={Boolean(user.twoFactorEnabled)}
      />
    </div>
  );
}
