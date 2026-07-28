import { SurfaceTheme } from "@/components/surface-theme";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SurfaceTheme className="flex min-h-dvh flex-col" surface="site">
      <SiteHeader />
      {children}
      <SiteFooter />
    </SurfaceTheme>
  );
}
