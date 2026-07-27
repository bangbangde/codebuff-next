import type { Metadata } from "next";
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
      className="bg-background [text-rendering:optimizeLegibility]"
      lang="zh-CN"
    >
      <body className="flex min-h-dvh flex-col  font-sans text-base leading-body text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
