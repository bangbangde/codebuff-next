import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getRuntimeAuth } from "./runtime";

export const getCurrentSession = cache(async () => {
  const requestHeaders = await headers();
  return getRuntimeAuth().api.getSession({
    headers: requestHeaders,
    query: {
      disableCookieCache: true,
      disableRefresh: true,
    },
  });
});

export async function requireCurrentSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}
