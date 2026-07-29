"use client";

import { useState } from "react";

import { DisableTotpForm } from "./disable-totp-form";
import { EnableTotpFlow } from "./enable-totp-flow";
import { RegenerateRecoveryCodes } from "./regenerate-recovery-codes";

type PendingFlow = "disable" | "regenerate";

export function TotpSection({ enabled }: { enabled: boolean }) {
  const [pendingFlow, setPendingFlow] = useState<PendingFlow | null>(null);

  if (!enabled) {
    return <EnableTotpFlow />;
  }

  return (
    <div>
      <p className="mt-3 text-sm leading-body text-muted-foreground">
        两步验证已启用。禁用后登录将仅需要密码。
      </p>

      <RegenerateRecoveryCodes
        disabled={pendingFlow !== null}
        onPendingChange={(pending) =>
          setPendingFlow(pending ? "regenerate" : null)
        }
      />

      <div className="my-6 h-px bg-border" />

      <DisableTotpForm
        disabled={pendingFlow !== null}
        onPendingChange={(pending) =>
          setPendingFlow(pending ? "disable" : null)
        }
      />
    </div>
  );
}
