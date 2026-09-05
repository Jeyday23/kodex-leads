import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authErrorMessage, authErrorCode, authErrorStatus, isUsableMessage } from "../lib/auth-error-message";
import { isTrustedRequestOrigin, trustedOrigins, readOriginHeaders } from "../lib/request-origin";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

/**
 * The shape @supabase/auth-js actually throws for a 5xx: it hits the
 * NETWORK_ERROR_CODES branch of handleError, builds the message from the
 * Response object rather than the parsed body, and JSON.stringify(response)
 * is "{}". This is the exact object that reached the reset-password page.
 */
class AuthRetryableFetchErrorLike extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthRetryableFetchError";
    this.status = status;
  }
}

class AuthApiErrorLike extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

test("a 500 no longer renders as {}", () => {
  const err = new AuthRetryableFetchErrorLike("{}", 500);
  const message = authErrorMessage(err, "Email delivery may not be configured.");

  assert.notEqual(message, "{}");
  assert.match(message, /HTTP 500/);
  assert.match(message, /server-side fault, not your password/);
  assert.match(message, /Email delivery may not be configured\./);
});

test("every empty-ish message auth-js can emit is treated as no message", () => {
  for (const empty of ["{}", "[]", "null", "undefined", "", "   "]) {
    assert.equal(isUsableMessage(empty), false, `${JSON.stringify(empty)} must not be shown to a user`);
  }
  assert.equal(isUsableMessage("Error sending recovery email"), true);
  assert.equal(isUsableMessage(undefined), false);
  assert.equal(isUsableMessage(42), false);
});

test("502, 503 and 504 are covered, not just 500", () => {
  for (const status of [500, 502, 503, 504, 520]) {
    const message = authErrorMessage(new AuthRetryableFetchErrorLike("{}", status));
    assert.match(message, new RegExp(`HTTP ${status}`));
  }
});

test("a network failure reports status 0 as unreachable, not as a server error", () => {
  const message = authErrorMessage(new AuthRetryableFetchErrorLike("{}", 0));
  assert.match(message, /Could not reach the authentication service/);
  assert.doesNotMatch(message, /HTTP/);
});

test("wrong password still reads as wrong password", () => {
  const err = new AuthApiErrorLike("Invalid login credentials", 400, "invalid_credentials");
  assert.equal(authErrorMessage(err, "Could not sign in."), "Incorrect email or password.");
});

test("an unconfirmed account is told to confirm, not told the password is wrong", () => {
  const err = new AuthApiErrorLike("Email not confirmed", 400, "email_not_confirmed");
  assert.match(authErrorMessage(err), /Confirm your email address first/);
});

test("rate limiting is named as rate limiting, by code or by status", () => {
  const byCode = new AuthApiErrorLike("{}", 429, "over_email_send_rate_limit");
  const byStatus = new AuthApiErrorLike("{}", 429);
  for (const err of [byCode, byStatus]) {
    assert.match(authErrorMessage(err), /Too many attempts/);
  }
});

test("a real server message is passed through when there is one", () => {
  const err = new AuthApiErrorLike("Signups not allowed for this instance", 422);
  assert.equal(authErrorMessage(err), "Signups not allowed for this instance");
});

test("a non-Error value falls back to the caller's copy", () => {
  assert.equal(authErrorMessage(null, "Could not send reset email."), "Could not send reset email.");
  assert.equal(authErrorMessage("boom", "Could not send reset email."), "Could not send reset email.");
});

test("status and code readers tolerate anything", () => {
  assert.equal(authErrorStatus(null), null);
  assert.equal(authErrorStatus({ status: "500" }), null);
  assert.equal(authErrorStatus({ status: 500 }), 500);
  assert.equal(authErrorCode({ error_code: "unexpected_failure" }), "unexpected_failure");
  assert.equal(authErrorCode({ code: "invalid_credentials" }), "invalid_credentials");
  assert.equal(authErrorCode({}), null);
});

/* ------------------------------------------------------------------ */
/* The origin guard that locked production out                        */
/* ------------------------------------------------------------------ */

const RENDER = {
  origin: "https://kodex-leads-production.onrender.com",
  forwardedHost: "kodex-leads-production.onrender.com",
  forwardedProto: "https",
  host: "kodex-leads-production.onrender.com",
};

test("the real production request is accepted", () => {
  // This is the case that returned 403 before: nextUrl.origin is the internal
  // listener, and the browser Origin is the public URL. They never match.
  assert.equal(isTrustedRequestOrigin(RENDER, "http://localhost:10000"), true);
});

test("a cross-site post is still rejected", () => {
  const attacker = { ...RENDER, origin: "https://evil.example.com" };
  assert.equal(isTrustedRequestOrigin(attacker, "http://localhost:10000"), false);
});

test("a lookalike host is rejected", () => {
  const lookalike = { ...RENDER, origin: "https://kodex-leads-production.onrender.com.evil.example" };
  assert.equal(isTrustedRequestOrigin(lookalike, "http://localhost:10000"), false);
});

test("http is rejected when the proxy terminated https", () => {
  const downgraded = { ...RENDER, origin: "http://kodex-leads-production.onrender.com" };
  assert.equal(isTrustedRequestOrigin(downgraded, "http://localhost:10000"), false);
});

test("local development with no proxy still works", () => {
  const local = {
    origin: "http://localhost:3000",
    forwardedHost: null,
    forwardedProto: null,
    host: "localhost:3000",
  };
  assert.equal(isTrustedRequestOrigin(local, "http://localhost:3000"), true);
});

test("a missing Origin header is allowed, because only browsers send one", () => {
  assert.equal(isTrustedRequestOrigin({ ...RENDER, origin: null }, "http://localhost:10000"), true);
});

test("a proxy chain uses the client-facing entry, not the last hop", () => {
  const chained = {
    origin: "https://kodex-leads-production.onrender.com",
    forwardedHost: "kodex-leads-production.onrender.com, internal-lb.local",
    forwardedProto: "https, http",
    host: "internal-lb.local",
  };
  assert.equal(isTrustedRequestOrigin(chained, "http://localhost:10000"), true);
});

test("NEXT_PUBLIC_SITE_URL is honoured, trailing slash and case included", () => {
  const custom = { ...RENDER, origin: "https://app.kodex-compliance.com" };
  assert.equal(isTrustedRequestOrigin(custom, "http://localhost:10000", "https://APP.kodex-compliance.com/"), true);
});

test("trustedOrigins never returns an empty set for a real request", () => {
  assert.ok(trustedOrigins(RENDER, "http://localhost:10000").length > 0);
});

test("readOriginHeaders reads the four headers the guard depends on", () => {
  const headers = new Map([
    ["origin", "https://example.com"],
    ["x-forwarded-host", "example.com"],
    ["x-forwarded-proto", "https"],
    ["host", "localhost:10000"],
  ]);
  const read = readOriginHeaders({ get: (name: string) => headers.get(name) ?? null });
  assert.deepEqual(read, {
    origin: "https://example.com",
    forwardedHost: "example.com",
    forwardedProto: "https",
    host: "localhost:10000",
  });
});

/* ------------------------------------------------------------------ */
/* Source-level guards: these regress silently otherwise              */
/* ------------------------------------------------------------------ */

test("no auth screen renders err.message directly any more", () => {
  const screens = [
    "app/auth/login/LoginForm.tsx",
    "app/auth/signup/page.tsx",
    "app/auth/reset-password/page.tsx",
    "app/auth/reset-password-confirm/page.tsx",
  ];
  for (const screen of screens) {
    const source = read(screen);
    assert.doesNotMatch(
      source,
      /err instanceof Error \? err\.message/,
      `${screen} must go through authErrorMessage, or a 5xx renders as {}`,
    );
    assert.match(source, /authErrorMessage/, `${screen} must import the shared helper`);
  }
});

test("the sign-in route never compares Origin against nextUrl.origin again", () => {
  const route = read("app/auth/signin/route.ts");
  assert.doesNotMatch(
    route,
    /origin !== request\.nextUrl\.origin/,
    "that comparison is http://localhost:10000 behind Render's proxy and 403s every real login",
  );
  assert.match(route, /isTrustedRequestOrigin/);
});
