"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Target,
  Users,
  Kanban,
  BookOpen,
  LogOut,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Prospects", icon: Target },
  { href: "/dashboard/leads", label: "All Leads", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
];

export function DashboardShell({
  children,
  partnerName,
  partnerRole,
}: {
  children: React.ReactNode;
  partnerName: string;
  partnerRole: string;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-screen bg-bg-muted">
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-border">
        <div className="p-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <span className="text-base font-bold text-navy">Kodex</span>
            <span className="text-base font-bold text-purple">Leads</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-purple/10 text-purple font-medium"
                    : "text-text-muted hover:bg-bg-muted hover:text-navy"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          {partnerRole === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium text-navy truncate">
                {partnerName}
              </p>
              <p className="text-xs text-text-muted capitalize">
                {partnerRole}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-500 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
