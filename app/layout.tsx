import type { Metadata } from "next";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codebuff",
  description:
    "Technical exploration, engineering notes, and practical experiments for the AI era.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="min-h-full bg-background scroll-pt-[5.5rem] [text-rendering:optimizeLegibility]"
      lang="en"
    >
      <body className="min-h-full bg-background font-sans text-base leading-body text-foreground antialiased">
        <SiteHeader />
        <div className="mx-auto w-full max-w-[calc(var(--layout-max)_+_2*var(--layout-gutter))] px-[var(--layout-gutter)]">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
