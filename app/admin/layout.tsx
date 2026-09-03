import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireAuthorityPage } from "@/lib/authority/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Authorization boundary for the entire private admin surface.
 *
 * Middleware rejects anonymous requests to /admin/*; this layout additionally
 * enforces the admin role, so a signed-in non-admin member cannot reach lead
 * data, Founder Ops or the Authority Engine.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAuthorityPage("/admin");
  return <>{children}</>;
}
