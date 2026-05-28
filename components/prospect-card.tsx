"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "./score-badge";
import {
  Copy,
  ExternalLink,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  SkipForward,
  User,
} from "lucide-react";

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
}

export interface Prospect {
  id: string;
  company: string;
  score: number;
  source: string;
  uses_ai: boolean;
  team_size: string;
  funding_stage: string;
  outreach_status: string;
  assessment_data: Record<string, unknown> | null;
  contacts: Contact[];
}

const SIGNAL_CONFIG: {
  test: (p: Prospect) => boolean;
  label: string;
  color: string;
}[] = [
  {
    test: (p) => p.uses_ai,
    label: "Uses AI",
    color: "bg-purple-100 text-purple-700",
  },
  {
    test: (p) => p.source === "scraper_jobs",
    label: "Hiring Compliance",
    color: "bg-amber-100 text-amber-700",
  },
  {
    test: (p) =>
      ["seed", "series-a", "series-b"].includes(p.funding_stage),
    label: "Recently Funded",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    test: (p) => p.team_size === "51-200" || p.team_size === "200+",
    label: "Scale-up",
    color: "bg-blue-100 text-blue-700",
  },
  {
    test: (p) => {
      if (!p.assessment_data) return false;
      const measures = p.assessment_data.compliance_measures;
      return Array.isArray(measures) && measures.length === 0;
    },
    label: "No Compliance",
    color: "bg-red-100 text-red-700",
  },
  {
    test: (p) => p.source.startsWith("assessment_"),
    label: "Completed Assessment",
    color: "bg-teal-100 text-teal-700",
  },
];

export function ProspectCard({
  prospect,
  onOutreachUpdate,
  onOpenTemplate,
}: {
  prospect: Prospect;
  onOutreachUpdate: (id: string, status: string) => void;
  onOpenTemplate: (prospect: Prospect, contact: Contact) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const signals = SIGNAL_CONFIG.filter((s) => s.test(prospect));
  const primaryContact = prospect.contacts[0];
  const otherContacts = prospect.contacts.slice(1);

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="border border-border rounded-xl bg-white hover:border-purple/30 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-navy text-lg">
              {prospect.company}
            </h3>
            <ScoreBadge score={prospect.score} />
          </div>
          {prospect.contacts.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-text-muted hover:text-navy p-1"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {signals.map((s) => (
              <span
                key={s.label}
                className={cn(
                  "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                  s.color
                )}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}

        {primaryContact ? (
          <ContactRow
            contact={primaryContact}
            copied={copied}
            onCopy={copyToClipboard}
            onEmail={() => onOpenTemplate(prospect, primaryContact)}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-text-muted py-2">
            <User className="w-4 h-4" />
            No contacts enriched yet
          </div>
        )}

        {expanded &&
          otherContacts.map((c) => (
            <div key={c.id} className="mt-3 pt-3 border-t border-border">
              <ContactRow
                contact={c}
                copied={copied}
                onCopy={copyToClipboard}
                onEmail={() => onOpenTemplate(prospect, c)}
              />
            </div>
          ))}

        {!expanded && otherContacts.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs text-purple hover:underline"
          >
            +{otherContacts.length} more contact
            {otherContacts.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="border-t border-border px-5 py-3 flex items-center gap-2">
        <button
          onClick={() => onOutreachUpdate(prospect.id, "emailed")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            prospect.outreach_status === "emailed"
              ? "bg-purple-100 text-purple-700"
              : "bg-bg-muted text-navy hover:bg-purple-50"
          )}
        >
          <Mail className="w-3.5 h-3.5" /> Mark Emailed
        </button>
        <button
          onClick={() => onOutreachUpdate(prospect.id, "meeting_booked")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            prospect.outreach_status === "meeting_booked"
              ? "bg-amber-100 text-amber-700"
              : "bg-bg-muted text-navy hover:bg-amber-50"
          )}
        >
          <Calendar className="w-3.5 h-3.5" /> Book Meeting
        </button>
        <button
          onClick={() => onOutreachUpdate(prospect.id, "not_interested")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-muted text-text-muted hover:bg-gray-100 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip
        </button>
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  copied,
  onCopy,
  onEmail,
}: {
  contact: Contact;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
  onEmail: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy truncate">
          {contact.name}
        </p>
        <p className="text-xs text-text-muted truncate">{contact.title}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {contact.email && (
          <>
            <button
              onClick={() => onCopy(contact.email!, `email-${contact.id}`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-bg-muted text-navy hover:bg-purple-50 hover:text-purple transition-colors"
              title={contact.email}
            >
              {copied === `email-${contact.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Email
            </button>
            <button
              onClick={onEmail}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-purple/10 text-purple hover:bg-purple/20 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Template
            </button>
          </>
        )}
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5]/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            LinkedIn
          </a>
        )}
        {contact.phone && (
          <button
            onClick={() => onCopy(contact.phone!, `phone-${contact.id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-bg-muted text-navy hover:bg-emerald-50 transition-colors"
            title={contact.phone}
          >
            {copied === `phone-${contact.id}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
