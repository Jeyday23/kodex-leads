"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  EMAIL_TEMPLATES,
  renderTemplate,
  type TemplateVars,
} from "@/lib/email-templates";
import { X, Copy, Check, Mail } from "lucide-react";

export function TemplateModal({
  vars,
  onClose,
}: {
  vars: TemplateVars;
  onClose: () => void;
}) {
  const [activeId, setActiveId] = useState(EMAIL_TEMPLATES[0].id);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const template = EMAIL_TEMPLATES.find((t) => t.id === activeId)!;
  const rendered = renderTemplate(template, vars);

  async function copy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple" />
            <h2 className="font-bold text-navy">
              Email {vars.contact_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-navy rounded-lg hover:bg-bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-border">
          {EMAIL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeId === t.id
                  ? "bg-purple text-white"
                  : "bg-bg-muted text-navy hover:bg-purple/10"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Subject
              </label>
              <button
                onClick={() => copy(rendered.subject, "subject")}
                className="inline-flex items-center gap-1 text-xs text-purple hover:underline"
              >
                {copiedField === "subject" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
            <div className="p-3 rounded-lg bg-bg-muted text-sm text-navy font-medium">
              {rendered.subject}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Body
              </label>
              <button
                onClick={() => copy(rendered.body, "body")}
                className="inline-flex items-center gap-1 text-xs text-purple hover:underline"
              >
                {copiedField === "body" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
            <div className="p-4 rounded-lg bg-bg-muted text-sm text-navy whitespace-pre-wrap leading-relaxed">
              {rendered.body}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={() =>
              copy(`${rendered.subject}\n\n${rendered.body}`, "all")
            }
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors",
              "bg-purple text-white hover:bg-purple"
            )}
          >
            {copiedField === "all" ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Copy All
          </button>
        </div>
      </div>
    </div>
  );
}
