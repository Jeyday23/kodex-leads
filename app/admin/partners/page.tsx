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
          <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">Partners</h1>
          <p className="text-sm text-[#7a8599]">Manage your sales partners</p>
        </div>
      </div>

      <AddPartnerForm />

      <div className="border border-[#dfe3ea] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#dfe3ea]">
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Code
              </th>
              <th className="text-center px-4 py-3 font-medium text-[#7a8599]">
                Rate
              </th>
              <th className="text-center px-4 py-3 font-medium text-[#7a8599]">
                Status
              </th>
              <th className="text-center px-4 py-3 font-medium text-[#7a8599]">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {partners && partners.length > 0 ? (
              partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#dfe3ea] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[#0F1F3D]">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-[#7a8599]">{p.email}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-[#f6f7f9] px-2 py-0.5 rounded font-mono">
                      {p.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center text-[#3d4a5c]">
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
                        p.role === "admin" ? "text-red-500 font-medium" : "text-[#7a8599]"
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
                  className="px-4 py-8 text-center text-[#7a8599]"
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
