import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { hasAdminRole } from "./admin-policy";
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

export async function requireAdmin() {
  const session = await requireCurrentSession();

  if (!hasAdminRole(session.user.role)) {
    forbidden();
  }

  return session;
}
