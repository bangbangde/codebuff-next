import type { Passkey } from "@better-auth/passkey";

import {
  formatPasskeyDate,
  getPasskeyLabel,
  getPasskeyTypeLabel,
} from "./passkey-formatters";
import { RemovePasskeyConfirmation } from "./remove-passkey-confirmation";
import { RenamePasskeyForm } from "./rename-passkey-form";
import type { PasskeyPendingAction } from "./use-passkeys";

type PasskeyItemProps = {
  editing: boolean;
  confirmingDelete: boolean;
  disabled: boolean;
  passkey: Passkey;
  pendingAction: PasskeyPendingAction | null;
  onCancelDelete: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onRename: (name: string) => Promise<void>;
  onStartDelete: () => void;
  onStartRename: () => void;
};

export function PasskeyItem({
  editing,
  confirmingDelete,
  disabled,
  passkey,
  pendingAction,
  onCancelDelete,
  onCancelRename,
  onDelete,
  onRename,
  onStartDelete,
  onStartRename,
}: PasskeyItemProps) {
  const label = getPasskeyLabel(passkey);

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-5 [@media(max-width:28rem)]:flex-col">
        <div className="min-w-0">
          <p className="m-0 break-words font-medium text-foreground">{label}</p>
          <p className="mt-1 text-sm leading-body text-muted-foreground">
            <span lang="en">{getPasskeyTypeLabel(passkey)}</span>
            {" · "}
            注册于 {formatPasskeyDate(passkey.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-medium text-foreground transition-[border-color,color] hover:border-brand-accent hover:text-brand-accent focus-visible:border-brand-accent focus-visible:text-brand-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            disabled={disabled}
            onClick={onStartRename}
            type="button"
          >
            Rename
          </button>
          <button
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-medium text-muted-foreground transition-[border-color,color] hover:border-brand-accent hover:text-brand-accent focus-visible:border-brand-accent focus-visible:text-brand-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            disabled={disabled}
            onClick={onStartDelete}
            type="button"
          >
            Remove
          </button>
        </div>
      </div>

      {editing && (
        <RenamePasskeyForm
          disabled={disabled}
          initialName={label}
          inputId={`passkey-name-${passkey.id}`}
          onCancel={onCancelRename}
          onRename={onRename}
          pending={pendingAction === `rename:${passkey.id}`}
        />
      )}

      {confirmingDelete && (
        <RemovePasskeyConfirmation
          disabled={disabled}
          label={label}
          onCancel={onCancelDelete}
          onRemove={onDelete}
          pending={pendingAction === `delete:${passkey.id}`}
        />
      )}
    </li>
  );
}
