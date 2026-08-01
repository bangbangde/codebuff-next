import type { Metadata } from "next";

import { SurfaceTheme } from "@/components/surface-theme";
import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "./_components/admin-shell";

export const metadata: Metadata = {
  title: "Admin",
  description: "CQ’s Lab 的已认证管理入口。",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolve authorization before any Suspense boundary can stream a 200
  // response, preserving redirect and forbidden HTTP status semantics.
  const session = await requireAdmin();

  return (
    <SurfaceTheme
      className="h-dvh overflow-hidden bg-background text-foreground"
      surface="admin"
    >
      <AdminShell
        identity={{
          email: session.user.email,
          name: session.user.name,
        }}
      >
        {children}
      </AdminShell>
    </SurfaceTheme>
  );
}
