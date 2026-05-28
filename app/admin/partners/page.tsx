import { createAdminClient } from "@/lib/supabase/server";
import { AddPartnerForm } from "./add-form";

export default async function PartnersPage() {
  const admin = createAdminClient();

  const { data: partners } = await admin
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Partners</h1>
          <p className="text-sm text-text-muted">Manage your sales partners</p>
        </div>
      </div>

      <AddPartnerForm />

      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Code
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">
                Rate
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">
                Status
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {partners && partners.length > 0 ? (
              partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-navy">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{p.email}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-bg-muted px-2 py-0.5 rounded font-mono">
                      {p.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center text-navy">
                    {(Number(p.commission_rate) * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        p.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs capitalize ${
                        p.role === "admin" ? "text-red-500 font-medium" : "text-text-muted"
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No partners yet. Add your first partner above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
