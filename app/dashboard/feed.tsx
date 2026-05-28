"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ProspectCard,
  type Prospect,
  type Contact,
} from "@/components/prospect-card";
import { TemplateModal } from "@/components/template-modal";
import { Target, Users, Mail } from "lucide-react";

interface FeedProps {
  prospects: Prospect[];
  stats: { totalProspects: number; withContacts: number; emailed: number };
}

export function ProspectingFeed({ prospects, stats }: FeedProps) {
  const router = useRouter();
  const [templateTarget, setTemplateTarget] = useState<{
    prospect: Prospect;
    contact: Contact;
  } | null>(null);

  async function handleOutreachUpdate(leadId: string, status: string) {
    const res = await fetch(`/api/leads/${leadId}/outreach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreach_status: status }),
    });

    if (!res.ok) {
      const claimRes = await fetch(`/api/leads/${leadId}/claim`, {
        method: "POST",
      });
      if (claimRes.ok) {
        await fetch(`/api/leads/${leadId}/outreach`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outreach_status: status }),
        });
      }
    }

    router.refresh();
  }

  function handleOpenTemplate(prospect: Prospect, contact: Contact) {
    setTemplateTarget({ prospect, contact });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">
          Today&apos;s Prospects
        </h1>
        <p className="text-sm text-[#7a8599]">
          Your top prospects sorted by score. Reach out to the right person.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Target}
          label="Prospects"
          value={stats.totalProspects}
          color="text-[#A855F7]"
          bgColor="bg-[#A855F7]/10"
        />
        <StatCard
          icon={Users}
          label="With Contacts"
          value={stats.withContacts}
          color="text-[#0D9488]"
          bgColor="bg-[#0D9488]/10"
        />
        <StatCard
          icon={Mail}
          label="Emailed"
          value={stats.emailed}
          color="text-[#0F1F3D]"
          bgColor="bg-[#0F1F3D]/10"
        />
      </div>

      {prospects.length > 0 ? (
        <div className="space-y-4">
          {prospects.map((p) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              onOutreachUpdate={handleOutreachUpdate}
              onOpenTemplate={handleOpenTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="border border-[#dfe3ea] rounded-xl bg-white p-12 text-center">
          <Target className="w-10 h-10 text-[#7a8599] mx-auto mb-3" />
          <h3 className="font-bold text-[#0F1F3D] mb-1">
            No prospects waiting
          </h3>
          <p className="text-sm text-[#7a8599]">
            New prospects appear here as scrapers find companies and enrichment
            identifies decision makers.
          </p>
        </div>
      )}

      {templateTarget && (
        <TemplateModal
          vars={{
            company: templateTarget.prospect.company,
            contact_name: templateTarget.contact.name,
            title: templateTarget.contact.title,
          }}
          onClose={() => setTemplateTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="border border-[#dfe3ea] rounded-xl bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#0F1F3D]">{value}</p>
          <p className="text-xs text-[#7a8599]">{label}</p>
        </div>
      </div>
    </div>
  );
}
