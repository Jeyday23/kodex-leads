// WS3 email sending. The Resend adapter is active only when RESEND_API_KEY
// is set and talks to Resend's HTTP API with plain fetch (no SDK dependency
// added). Without a key, getEmailSender() returns a queue-only sender that
// never touches the network - sending an email is always an explicit action
// taken by a human from the approval queue, never automatic.

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export type SendEmailStatus = "sent" | "queued" | "failed";

export interface SendEmailResult {
  status: SendEmailStatus;
  detail?: string;
}

export interface EmailSender {
  id: "resend" | "queue-only";
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export const queueOnlyEmailSender: EmailSender = {
  id: "queue-only",
  async send(): Promise<SendEmailResult> {
    return {
      status: "queued",
      detail: "RESEND_API_KEY is not configured. This email stays queue-only; send it manually or configure Resend.",
    };
  },
};

export function createResendEmailSender(apiKey: string, fromEmail: string): EmailSender {
  return {
    id: "resend",
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [input.to],
            subject: input.subject,
            text: input.body,
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return { status: "failed", detail: `Resend HTTP ${response.status}: ${detail}` };
        }

        return { status: "sent" };
      } catch (error) {
        return { status: "failed", detail: error instanceof Error ? error.message : "Unknown Resend error." };
      }
    },
  };
}

/**
 * Picks the active sender based on environment configuration. Honest by
 * construction: with no RESEND_API_KEY, every email step remains queue-only.
 */
export function getEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return queueOnlyEmailSender;
  return createResendEmailSender(apiKey, fromEmail);
}

export function getEmailSenderStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM_EMAIL) missing.push("RESEND_FROM_EMAIL");
  return { configured: missing.length === 0, missing };
}
