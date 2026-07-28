type RemovePasskeyConfirmationProps = {
  disabled: boolean;
  label: string;
  pending: boolean;
  onCancel: () => void;
  onRemove: () => void;
};

export function RemovePasskeyConfirmation({
  disabled,
  label,
  pending,
  onCancel,
  onRemove,
}: RemovePasskeyConfirmationProps) {
  return (
    <div
      className="mt-5 rounded-md border border-brand-accent/30 bg-brand-accent/10 p-4"
      role="alert"
    >
      <p className="m-0 text-sm leading-body text-foreground">
        从账户移除 “{label}”？设备或密码管理器中的凭据需要另行删除。
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="min-h-10 rounded-md bg-brand-accent px-4 py-2 font-mono text-xs font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-wait disabled:opacity-50"
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          {pending ? "Removing…" : "Remove passkey"}
        </button>
        <button
          className="min-h-10 rounded-md px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
