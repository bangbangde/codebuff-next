import type { Metadata } from "next";

import { SurfaceTheme } from "@/components/surface-theme";
import { requireCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin",
  description: "Authenticated administration entry for CQ’s Lab.",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireCurrentSession();

  return (
    <SurfaceTheme
      className="min-h-dvh bg-background text-foreground"
      surface="admin"
    >
      {children}
    </SurfaceTheme>
  );
}
