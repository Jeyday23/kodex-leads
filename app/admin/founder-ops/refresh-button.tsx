"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return <button className={styles.refresh} onClick={refresh} type="button">{refreshing ? "Refreshing…" : "Refresh data"}</button>;
}
