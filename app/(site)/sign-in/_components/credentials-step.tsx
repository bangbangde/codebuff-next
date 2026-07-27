import type { FormEventHandler } from "react";

import {
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/app/(site)/_components/auth-form-styles";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";
import type { SignInPendingAction } from "../_lib/sign-in-types";
import { PasskeySignInButton } from "./passkey-sign-in-button";

type CredentialsStepProps = {
  message: string;
  pendingAction: SignInPendingAction | null;
  onPasskeySignIn: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CredentialsStep({
  message,
  pendingAction,
  onPasskeySignIn,
  onSubmit,
}: CredentialsStepProps) {
  const isPending = pendingAction !== null;

  return (
    <form className="mt-10" onSubmit={onSubmit}>
      <div>
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="email"
          lang="en"
        >
          Email
        </label>
        <input
          autoCapitalize="none"
          autoComplete="email"
          className={authInputClassName}
          id="email"
          inputMode="email"
          maxLength={320}
          name="email"
          placeholder="you@example.com"
          required
          spellCheck={false}
          type="email"
        />
      </div>

      <div className="mt-6">
        <label
          className="block font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
          htmlFor="password"
          lang="en"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className={authInputClassName}
          id="password"
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          minLength={AUTH_PASSWORD_MIN_LENGTH}
          name="password"
          required
          type="password"
        />
      </div>

      <p
        aria-live="polite"
        className="mt-5 min-h-[1.65em] text-sm text-accent"
        role="status"
      >
        {message}
      </p>

      <button
        className={authPrimaryButtonClassName}
        disabled={isPending}
        type="submit"
      >
        {pendingAction === "credentials" ? "Signing in…" : "Sign in"}
      </button>

      <div
        aria-hidden="true"
        className="my-7 flex items-center gap-3 text-muted-foreground"
      >
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[0.7rem] tracking-label uppercase">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <PasskeySignInButton
        disabled={isPending}
        onSignIn={onPasskeySignIn}
        pending={pendingAction === "passkey"}
      />
    </form>
  );
}
