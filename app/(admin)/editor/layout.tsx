import { requireAdmin } from "@/lib/auth/session";

export default async function EditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
