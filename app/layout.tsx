import type { Metadata } from "next";

import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CQ’s Lab",
    template: "%s · CQ’s Lab",
  },
  description:
    "记录软件开发、AI 应用、工作与生活中的学习、实践与思考。",
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
