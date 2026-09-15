const FATAL_LEAD_ERROR = /\b(supabase|schema|rls|row level security|permission|unauthori[sz]ed|service_role|service role|auth|jwt)\b/i;

export type LeadRunStatus = "ok" | "no-leads" | "completed-with-warnings" | "completed-with-errors" | "error";

export function isFatalLeadRunError(message: string): boolean {
  return FATAL_LEAD_ERROR.test(message);
}

export function splitLeadRunMessages(messages: string[]): { fatalErrors: string[]; warnings: string[] } {
  const fatalErrors: string[] = [];
  const warnings: string[] = [];
  for (const message of messages) {
    if (isFatalLeadRunError(message)) fatalErrors.push(message);
    else warnings.push(message);
  }
  return { fatalErrors, warnings };
}

export function leadRunStatus(hasLeads: boolean, messages: string[]): LeadRunStatus {
  if (messages.length === 0) return hasLeads ? "ok" : "no-leads";
  const { fatalErrors } = splitLeadRunMessages(messages);
  if (fatalErrors.length > 0) return hasLeads ? "completed-with-errors" : "error";
  return hasLeads ? "completed-with-warnings" : "no-leads";
}
