import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
