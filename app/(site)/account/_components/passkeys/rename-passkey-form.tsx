import { useState, type FormEvent } from "react";

import { authInputClassName } from "@/app/(site)/_components/auth-form-styles";
import { AUTH_PASSKEY_NAME_MAX_LENGTH } from "@/lib/auth/passkey-policy";

type RenamePasskeyFormProps = {
  disabled: boolean;
  initialName: string;
  inputId: string;
  pending: boolean;
  onCancel: () => void;
  onRename: (name: string) => Promise<void>;
};

export function RenamePasskeyForm({
  disabled,
  initialName,
  inputId,
  pending,
  onCancel,
  onRename,
}: RenamePasskeyFormProps) {
  const [name, setName] = useState(initialName);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onRename(name);
  }

  return (
    <form
      className="mt-5 rounded-md border border-border bg-background p-4"
      onSubmit={handleSubmit}
    >
      <label
        className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
        htmlFor={inputId}
        lang="en"
      >
        Passkey name
      </label>
      <input
        autoComplete="off"
        className={authInputClassName}
        id={inputId}
        maxLength={AUTH_PASSKEY_NAME_MAX_LENGTH}
        onChange={(event) => setName(event.currentTarget.value)}
        required
        type="text"
        value={name}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="min-h-10 rounded-md bg-foreground px-4 py-2 font-mono text-xs font-medium text-background transition-colors hover:bg-brand-accent focus-visible:bg-brand-accent focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none"
          disabled={disabled}
          type="submit"
        >
          {pending ? "Saving…" : "Save"}
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
    </form>
  );
}
