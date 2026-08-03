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
  description: "Private Kodex SEO authority system for source-backed content, LLM visibility checks and search recognition.",
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
              <Link href="/admin/seo">SEO Queue</Link>
              <Link href="/api/seo/ai-sitemap">AI Sitemap</Link>
              <Link href="/auth/login">Login</Link>
            </nav>
          </header>
          {children}
          <footer className="footer">Private authority system. Public pages are source-backed and publish only after quality, indexing and attribution checks pass.</footer>
        </div>
      </body>
    </html>
  );
}
