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
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="site-shell site-header__inner">
            <Link className="brand" href="/" aria-label="Codebuff home">
              <svg
                className="brand__mark"
                viewBox="0 0 84 26"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  className="brand__line"
                  d="M4 3v13c0 3.6 2.7 6 6.2 6 3.8 0 6.8-2.9 6.8-6.6 0-3.5-2.7-6.4-6.2-6.4H4"
                />
                <path
                  className="brand__line"
                  d="M26 10v6c0 3.4 2.6 6 6 6s6-2.6 6-6v-6"
                />
                <path
                  className="brand__line"
                  d="M50 22V8c0-3.3 2.7-6 6-6h4M46 10h11"
                />
                <path
                  className="brand__line"
                  d="M70 22V8c0-3.3 2.7-6 6-6h4M66 10h11"
                />
                <circle className="brand__node" cx="4" cy="3" r="1.8" />
                <circle className="brand__node" cx="26" cy="10" r="1.8" />
                <circle className="brand__accent-node" cx="80" cy="2" r="1.8" />
              </svg>
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
