type SkeletonProps = {
  variant?: "page" | "workspace" | "table";
};

export function KodexSkeleton({ variant = "page" }: SkeletonProps) {
  if (variant === "workspace") {
    return (
      <div className="kx-skeleton-workspace" role="status" aria-live="polite" aria-label="Loading workspace">
        <aside className="kx-skeleton-sidebar" aria-hidden="true">
          <div className="kx-skeleton kx-skeleton-logo" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="kx-skeleton kx-skeleton-nav" key={index} />
          ))}
        </aside>
        <main className="kx-skeleton-main" aria-hidden="true">
          <div className="kx-skeleton kx-skeleton-kicker" />
          <div className="kx-skeleton kx-skeleton-title" />
          <div className="kx-skeleton kx-skeleton-copy" />
          <div className="kx-skeleton-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="kx-skeleton-card" key={index}>
                <div className="kx-skeleton kx-skeleton-label" />
                <div className="kx-skeleton kx-skeleton-number" />
              </div>
            ))}
          </div>
          <div className="kx-skeleton-card kx-skeleton-table-card">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="kx-skeleton-row" key={index}>
                <div className="kx-skeleton kx-skeleton-cell wide" />
                <div className="kx-skeleton kx-skeleton-cell" />
                <div className="kx-skeleton kx-skeleton-cell" />
              </div>
            ))}
          </div>
        </main>
        <span className="sr-only">Loading Kodex workspace…</span>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="kx-skeleton-card" role="status" aria-label="Loading data">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="kx-skeleton-row" key={index} aria-hidden="true">
            <div className="kx-skeleton kx-skeleton-cell wide" />
            <div className="kx-skeleton kx-skeleton-cell" />
            <div className="kx-skeleton kx-skeleton-cell" />
          </div>
        ))}
        <span className="sr-only">Loading data…</span>
      </div>
    );
  }

  return (
    <main className="kx-skeleton-page" role="status" aria-live="polite" aria-label="Loading page">
      <div className="kx-skeleton kx-skeleton-kicker" aria-hidden="true" />
      <div className="kx-skeleton kx-skeleton-title" aria-hidden="true" />
      <div className="kx-skeleton kx-skeleton-copy" aria-hidden="true" />
      <div className="kx-skeleton-grid kx-skeleton-grid-four" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="kx-skeleton-card" key={index}>
            <div className="kx-skeleton kx-skeleton-label" />
            <div className="kx-skeleton kx-skeleton-number" />
            <div className="kx-skeleton kx-skeleton-copy short" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading Kodex…</span>
    </main>
  );
}
