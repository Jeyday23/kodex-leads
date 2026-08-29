"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Kodex route error", error);
  }, [error]);

  return (
    <main className="kx-error-shell">
      <p className="eyebrow">Recoverable error</p>
      <h2>This view hit a problem.</h2>
      <p>
        The rest of the workspace is still available. Retry this route first; if it fails again, open Authority Command to inspect system health before changing autonomy settings.
      </p>
      <div className="kx-error-actions">
        <button type="button" onClick={reset}>Try again</button>
        <Link href="/admin/authority/command">System health</Link>
        <Link href="/">Home</Link>
      </div>
    </main>
  );
}
