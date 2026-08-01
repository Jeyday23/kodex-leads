import type { Metadata } from "next";
import Link from "next/link";
import "./styles/organism.css"
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodex-compliance.com"),
  title: {
    default: "Kodex",
    template: "%s | Kodex",
  },
  description: "EU compliance assessments, deadline intelligence and source-backed readiness paths for growth teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              Kodex
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/deadlines/eu-ai-act">Deadlines</Link>
              <Link href="/compare/vanta-vs-kodex">Compare</Link>
              <Link href="/assess/eu-ai-act">Assessment</Link>
            </nav>
          </header>
          {children}
          <footer className="footer">Source-backed compliance pages publish only after quality, indexing and attribution checks pass.</footer>
        </div>
      </body>
    </html>
  );
}
