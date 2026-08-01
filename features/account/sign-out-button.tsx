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
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-foreground px-5 py-2.5 font-mono text-sm text-foreground transition-[color,background-color,border-color,opacity] duration-150 ease-[ease] hover:border-brand-accent hover:bg-brand-accent hover:text-background focus-visible:border-brand-accent focus-visible:bg-brand-accent focus-visible:text-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        disabled={isPending}
        onClick={handleSignOut}
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
