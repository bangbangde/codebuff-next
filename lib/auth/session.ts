import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getRuntimeAuth } from "./runtime";

export const getCurrentSession = cache(async () => {
  await connection();

  return getRuntimeAuth().api.getSession({
    headers: await headers(),
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
