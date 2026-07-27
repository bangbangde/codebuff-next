import type { Passkey } from "@better-auth/passkey";

import { PasskeyItem } from "./passkey-item";
import type { PasskeyPendingAction } from "./use-passkeys";

type PasskeyListProps = {
  confirmingDeleteId: string | null;
  disabled: boolean;
  editingId: string | null;
  isLoading: boolean;
  passkeys: Passkey[];
  pendingAction: PasskeyPendingAction | null;
  onCancelDelete: () => void;
  onCancelRename: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onStartDelete: (id: string) => void;
  onStartRename: (id: string) => void;
};

export function PasskeyList({
  confirmingDeleteId,
  disabled,
  editingId,
  isLoading,
  passkeys,
  pendingAction,
  onCancelDelete,
  onCancelRename,
  onDelete,
  onRename,
  onStartDelete,
  onStartRename,
}: PasskeyListProps) {
  if (isLoading) {
    return <p className="m-0 text-sm text-muted-foreground">Loading passkeys…</p>;
  }

  if (passkeys.length === 0) {
    return (
      <p className="m-0 rounded-md border border-dashed border-border bg-background p-4 text-sm leading-body text-muted-foreground">
        还没有注册 Passkey。密码和 TOTP 登录方式不会因注册 Passkey 而改变。
      </p>
    );
  }

  return (
    <ul className="m-0 list-none divide-y divide-border p-0">
      {passkeys.map((passkey) => (
        <PasskeyItem
          confirmingDelete={confirmingDeleteId === passkey.id}
          disabled={disabled}
          editing={editingId === passkey.id}
          key={passkey.id}
          onCancelDelete={onCancelDelete}
          onCancelRename={onCancelRename}
          onDelete={() => void onDelete(passkey.id)}
          onRename={(name) => onRename(passkey.id, name)}
          onStartDelete={() => onStartDelete(passkey.id)}
          onStartRename={() => onStartRename(passkey.id)}
          passkey={passkey}
          pendingAction={pendingAction}
        />
      ))}
    </ul>
  );
}
