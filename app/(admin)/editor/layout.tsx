import { SurfaceTheme } from "@/components/surface-theme";
import { requireAdmin } from "@/lib/auth/session";

export default async function EditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <SurfaceTheme className="flex h-dvh flex-col overflow-hidden bg-background text-foreground" surface="admin">
      {children}
    </SurfaceTheme>
  );
}
