"use client";

import { useSignOut } from "./use-sign-out";

export function SignOutButton() {
  const { isPending, message, signOut } = useSignOut();

  return (
    <div>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-foreground px-5 py-2.5 font-mono text-sm text-foreground transition-[color,background-color,border-color,opacity] duration-150 ease-[ease] hover:border-brand-accent hover:bg-brand-accent hover:text-background focus-visible:border-brand-accent focus-visible:bg-brand-accent focus-visible:text-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        disabled={isPending}
        onClick={signOut}
        type="button"
      >
        {isPending ? "正在退出…" : "退出登录"}
      </button>
      <p
        aria-live="polite"
        className="mt-3 min-h-[1.65em] text-sm text-brand-accent"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}
