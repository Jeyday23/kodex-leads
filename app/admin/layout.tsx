import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminShell } from "./shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (partner?.role !== "admin") redirect("/dashboard");

  return <AdminShell adminName={partner.name}>{children}</AdminShell>;
}
