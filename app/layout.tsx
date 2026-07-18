import type { Metadata } from "next";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CQ’s Lab",
    template: "%s · CQ’s Lab",
  },
  description:
    "CQ’s personal technical lab for notes, experiments, and work in progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="min-h-full bg-background scroll-pt-[5.5rem] [text-rendering:optimizeLegibility]"
      lang="zh-CN"
    >
      <body className="min-h-full bg-background font-sans text-base leading-body text-foreground antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
