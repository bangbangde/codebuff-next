import type { Metadata } from "next";
import Link from "next/link";
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
      <body>
        <header className="site-header">
          <div className="site-shell site-header__inner">
            <Link className="brand" href="/" aria-label="Codebuff home">
              <span className="brand__mark" aria-hidden="true">CB</span>
              <span>Codebuff</span>
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/lab">Lab</Link>
              <Link href="/me">Me</Link>
            </nav>
          </div>
        </header>
        <div className="site-shell">{children}</div>
        <footer className="site-footer">
          <div className="site-shell site-footer__inner">
            <p>Codebuff</p>
            <p>Thinking, building, learning.</p>
            <p>© {new Date().getFullYear()}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
