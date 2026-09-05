/**
 * Turns whatever Supabase auth throws into something a person can act on.
 *
 * The bug this exists for: @supabase/auth-js treats every 5xx as retryable and
 * builds the error from the *Response object* rather than the parsed body
 * (see its lib/fetch.js handleError -> NETWORK_ERROR_CODES branch). A Response
 * has no `msg`, `message`, `error_description` or `error` property, so the
 * library's own _getErrorMessage falls through to JSON.stringify(response),
 * which is the string "{}". Rendering `err.message` directly therefore showed
 * users two braces where the server had sent
 *   {"code":500,"error_code":"unexpected_failure","msg":"Error sending recovery email"}
 *
 * So: never trust `message` alone. Read the status the library does preserve,
 * and only use `message` when it carries real text.
 */

/** Messages auth-js can produce that say nothing. */
const EMPTY_MESSAGES = new Set(["{}", "[]", "null", "undefined", "{}\n", ""]);

export function isUsableMessage(message: unknown): message is string {
  return typeof message === "string" && !EMPTY_MESSAGES.has(message.trim());
}

/** Supabase's AuthError carries `status`; AuthRetryableFetchError uses 0 for network failures. */
export function authErrorStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function authErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const record = err as { code?: unknown; error_code?: unknown };
  const code = record.code ?? record.error_code;
  return typeof code === "string" ? code : null;
}

/**
 * @param fallback what to say when nothing more specific is known. Callers pass
 *   copy for their own screen, because "could not sign in" on the reset page
 *   sends the user looking for the wrong problem.
 */
export function authErrorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
  const status = authErrorStatus(err);
  const code = authErrorCode(err);
  const raw = err && typeof err === "object" ? (err as { message?: unknown }).message : undefined;
  const message = isUsableMessage(raw) ? raw.trim() : null;

  // Known wording first: these are stable strings Supabase returns verbatim and
  // the friendlier copy is what the user actually needs.
  if (message) {
    if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(message)) {
      return "Confirm your email address first. Check your inbox for the confirmation link.";
    }
  }

  if (code === "over_email_send_rate_limit" || status === 429) {
    return "Too many attempts. Wait a few minutes before trying again.";
  }

  // The 5xx case the braces were hiding. auth-js loses the body here, so the
  // status is all there is — say so plainly rather than inventing a cause.
  if (status !== null && status >= 500) {
    return `The authentication service returned an error (HTTP ${status}). This is a server-side fault, not your password. ${fallback}`;
  }

  // Network failure: auth-js reports status 0 when the request never completed.
  if (status === 0) {
    return "Could not reach the authentication service. Check your connection and try again.";
  }

  if (message) return message;
  return fallback;
}
