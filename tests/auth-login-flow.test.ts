import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isAdminRole } from "../lib/supabase/config";

/**
 * app/auth/login/LoginForm.tsx, lib/auth-client.ts and app/auth/signin/route.ts
 * cannot be imported here: they are client/route modules that pull in
 * next/navigation and next/server. Same source-level assertion approach as
 * tests/control-surface.test.ts.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const form = read("app/auth/login/LoginForm.tsx");
const client = read("lib/auth-client.ts");
const route = read("app/auth/signin/route.ts");
const middleware = read("proxy.ts");

/**
 * LoginForm has three submit handlers sharing one component: password
 * sign-in, and the two OTP steps (request a code, verify it). Each has its
 * own try/catch/finally, so every safety property below is checked per
 * handler rather than once for the whole file.
 */
const HANDLER_NAMES = ["handlePasswordSubmit", "handleOtpRequest", "handleOtpVerify"] as const;

/** Extracts one `async function <name>(...) { ... }` body by brace counting. */
function extractHandler(source: string, name: string): string {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start > -1, `${name} not found in LoginForm`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const handlers = HANDLER_NAMES.map((name) => [name, extractHandler(form, name)] as const);

test("no submit handler can be left permanently disabled", () => {
  // The freeze: setLoading(false) lived only in catch, so a success that
  // redirected back to /auth/login left `loading` true on a reused component.
  // That has to hold for every handler, not just the original password one.
  for (const [name, body] of handlers) {
    assert.match(
      body,
      /\}\s*finally\s*\{[\s\S]*?setLoading\(false\);[\s\S]*?\}/,
      `${name} must clear loading in a finally block`,
    );

    const resets = body.match(/setLoading\(false\)/g) ?? [];
    assert.equal(resets.length, 1, `${name} must clear loading in exactly one place, the finally block`);

    const catchBlock = body.slice(body.indexOf("} catch (err) {"), body.indexOf("} finally {"));
    assert.doesNotMatch(catchBlock, /setLoading\(false\)/, `${name}: the catch-only reset is the bug being fixed`);
  }

  // The disabled state on every submit/secondary button is still driven by
  // `loading` and nothing else: one per handler's submit button, plus the
  // "use a different email" button in the OTP verify step.
  const disabledAttrs = form.match(/disabled=\{loading\}/g) ?? [];
  assert.equal(disabledAttrs.length, 4, "every submit/secondary button should disable on `loading`");
});

test("the success path cannot navigate before the session is established", () => {
  // The browser no longer writes the session cookie itself; the server route
  // returns it as Set-Cookie, which is committed before the fetch resolves.
  assert.doesNotMatch(
    client,
    /supabase\.auth\.signInWithPassword/,
    "sign-in must not run against the browser client",
  );
  assert.match(client, /await fetch\("\/auth\/signin"/);
  assert.match(client, /await fetch\("\/auth\/otp\/request"/);
  assert.match(client, /await fetch\("\/auth\/otp\/verify"/);
  assert.match(client, /method: "POST"/);
  assert.match(client, /credentials: "same-origin"/);

  assert.match(route, /createSupabaseServerClient/);
  assert.match(route, /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/);

  // Ordering within each session-establishing handler: await the sign-in
  // call, refresh the router cache, then navigate. handleOtpRequest never
  // establishes a session, so it is not held to this ordering.
  for (const [name, body] of handlers) {
    if (name === "handleOtpRequest") continue;
    const refreshAt = body.indexOf("router.refresh()");
    const replaceAt = body.indexOf("router.replace(");
    assert.ok(refreshAt > -1 && replaceAt > -1, `${name} must refresh then navigate`);
    assert.ok(refreshAt < replaceAt, `${name}: the stale signed-out render must be dropped before navigating`);
  }
  const passwordBody = handlers.find(([name]) => name === "handlePasswordSubmit")![1];
  const otpVerifyBody = handlers.find(([name]) => name === "handleOtpVerify")![1];
  assert.ok(passwordBody.indexOf("await signIn(email, password)") < passwordBody.indexOf("router.refresh()"));
  assert.ok(otpVerifyBody.indexOf("await verifyOtp(otpSentTo, code)") < otpVerifyBody.indexOf("router.refresh()"));

  // The race is closed by ordering, not by waiting and hoping.
  for (const [name, source] of [["LoginForm", form], ["auth-client", client]] as const) {
    assert.doesNotMatch(source, /setTimeout|sleep\(/, `${name} must not paper over the race with a delay`);
  }
});

test("a role rejection surfaces a role reason, never signin-required", () => {
  // The route resolves the role in the same request as the sign-in.
  assert.match(route, /from\("profiles"\)/);
  assert.match(route, /isAdminRole/);
  assert.doesNotMatch(
    route,
    /user_metadata\s*[.?[]/,
    "role must never be read from client-writable metadata",
  );
  assert.match(route, /reason: "not-authorized"[\s\S]*?status: 403/);
  assert.doesNotMatch(
    route,
    /reason: "signin-required"/,
    "a signed-in non-admin is not a sign-in problem",
  );

  // The form shows the reason the server sent rather than a generic failure.
  assert.match(client, /class SignInError extends Error/);
  assert.match(form, /err instanceof SignInError && err\.reason && REASON_MESSAGES\[err\.reason\]/);
  assert.match(REASON_MESSAGES(form, "not-authorized"), /does not have administrator access/);
  // The signup dead end is named, since that is where members come from.
  assert.match(REASON_MESSAGES(form, "not-authorized"), /member/i);

  // The default role a self-service signup gets really is barred from /admin.
  assert.equal(isAdminRole("member"), false);
});

test("the sign-in route fails closed and stays server-side", () => {
  assert.match(route, /if \(!supabase\)/);
  assert.match(route, /reason: "auth-unavailable"[\s\S]*?status: 503/);
  // Login CSRF: a foreign origin must not be able to establish a session here.
  // The check reads the forwarded headers, not request.nextUrl.origin, which
  // behind Render's proxy is http://localhost:10000 and 403s every real login.
  // The origin cases themselves are covered in tests/auth-error-surfacing.test.ts.
  assert.match(route, /readOriginHeaders\(request\.headers\)/);
  assert.match(route, /isTrustedRequestOrigin\(/);
  assert.doesNotMatch(route, /origin !== request\.nextUrl\.origin/);
  assert.match(route, /status: 403/);
  // The password must reach Supabase exactly as typed.
  assert.doesNotMatch(route, /readString\(body, "password"\)\.trim\(\)/);

  // Middleware keeps verifying the token rather than trusting the cookie.
  assert.match(middleware, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(middleware, /auth\.getSession\(\)/);
  assert.match(middleware, /loginRedirect\(request, "auth-unavailable"\)/);
});

/** Reads one entry out of the form's REASON_MESSAGES map. */
function REASON_MESSAGES(source: string, key: string): string {
  const start = source.indexOf(`"${key}":`);
  assert.ok(start > -1, `REASON_MESSAGES is missing ${key}`);
  return source.slice(start, source.indexOf('",', start) + 1);
}
