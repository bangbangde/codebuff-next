"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignOut() {
    setIsPending(true);
    setMessage("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setMessage("暂时无法退出，请重试。");
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setMessage("暂时无法退出，请重试。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-foreground px-5 py-2.5 font-mono text-sm text-foreground transition-[color,background-color,border-color,opacity] duration-150 ease-[ease] hover:border-accent hover:bg-accent hover:text-background focus-visible:border-accent focus-visible:bg-accent focus-visible:text-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        disabled={isPending}
        onClick={handleSignOut}
        type="button"
      >
        {isPending ? "Signing out…" : "Sign out"}
      </button>
      <p
        aria-live="polite"
        className="mt-3 min-h-[1.65em] text-sm text-accent"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}
