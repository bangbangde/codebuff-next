"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function useSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function signOut() {
    setIsPending(true);
    setMessage("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setMessage("暂时无法退出，请重试。");
        return false;
      }

      router.replace("/sign-in");
      router.refresh();
      return true;
    } catch {
      setMessage("暂时无法退出，请重试。");
      return false;
    } finally {
      setIsPending(false);
    }
  }

  return { isPending, message, signOut };
}
