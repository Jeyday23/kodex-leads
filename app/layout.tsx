import type { Metadata } from "next";
import Link from "next/link";
import "./styles/organism.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodex-compliance.com"),
  title: {
    default: "Kodex Growth Intelligence",
    template: "%s | Kodex",
  },
  description: "Kodex growth intelligence for lead discovery, source-backed SEO, Google indexing feedback and LLM visibility.",
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
              <Link href="/admin/authority/command">Authority</Link>
              <Link href="/admin/seo">SEO</Link>
              <Link href="/admin/leads">Leads</Link>
              <Link href="/api/seo/ai-sitemap">AI Sitemap</Link>
            </nav>
          </header>
          {children}
          <footer className="footer">Kodex staging · open-access growth intelligence · secure authentication should be restored before production.</footer>
        </div>
      </body>
    </html>
  );
}
