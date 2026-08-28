"use client";

import { useEffect, useState } from "react";

interface DashboardMetrics {
  metrics: {
    totalLeads: number;
    completed: number;
    conversion: number;
    pending: number;
  };
  monthlyTrend: Array<{
    name: string;
    leads: number;
    completed: number;
  }>;
  gradeDistribution: Array<Record<string, unknown>>;
  frameworks: string[];
}

export function useDashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/admin/metrics");
        if (!response.ok) throw new Error("Failed to fetch metrics");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
