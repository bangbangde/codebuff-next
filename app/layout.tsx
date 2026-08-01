import type { Metadata } from "next";

import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CQ’s Lab",
    template: "%s · CQ’s Lab",
  },
  description:
    "CQ 的个人技术实验室，记录笔记、实验与持续推进中的工作。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="[text-rendering:optimizeLegibility]"
      lang="zh-CN"
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans text-base leading-body antialiased">
        <ColorSchemeProvider>{children}</ColorSchemeProvider>
      </body>
    </html>
  );
}
