import { DisableTotpSection } from "./disable-totp-section";
import { EnableTotpSection } from "./enable-totp-section";

export function TotpSection({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <DisableTotpSection />;
  }

  return <EnableTotpSection />;
}
