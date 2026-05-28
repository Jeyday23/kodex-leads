"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Bot,
  DollarSign,
  ArrowLeft,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/leads", label: "All Leads", icon: Users },
  { href: "/admin/partners", label: "Partners", icon: UserCog },
  { href: "/admin/scrapers", label: "Scrapers", icon: Bot },
];

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#f6f7f9]">
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-[#dfe3ea]">
        <div className="p-5 border-b border-[#dfe3ea]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-base font-bold text-[#0F1F3D]">
              Admin Panel
            </span>
          </div>
          <p className="text-xs text-[#7a8599] mt-1">{adminName}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-red-50 text-red-600 font-medium"
                    : "text-[#7a8599] hover:bg-[#f6f7f9] hover:text-[#3d4a5c]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#dfe3ea]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-[#7a8599] hover:text-[#3d4a5c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
