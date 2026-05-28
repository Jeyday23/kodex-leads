import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("name, email, role, code")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      partnerName={partner?.name ?? user.email ?? "Partner"}
      partnerRole={partner?.role ?? "partner"}
    >
      {children}
    </DashboardShell>
  );
}
