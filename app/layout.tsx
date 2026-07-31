import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodex-compliance.com"),
  title: {
    default: "Kodex SEO Engine",
    template: "%s | Kodex SEO Engine",
  },
  description: "Automated SEO, LLM discovery, traffic capture and lead attribution for Kodex.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              Kodex SEO Engine
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/learn/seo/llm-discovery">Process</Link>
              <Link href="/llms.txt">LLMs</Link>
              <Link href="/api/seo/ai-sitemap">AI Sitemap</Link>
              <a href="/admin/leads">Leads</a>
            </nav>
          </header>
          {children}
          <footer className="footer">SEO pages publish only after source, quality, indexing and attribution checks pass.</footer>
        </div>
      </body>
    </html>
  );
}
