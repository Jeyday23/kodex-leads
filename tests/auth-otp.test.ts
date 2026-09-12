import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The OTP routes cannot be imported here for the same reason as
 * app/auth/signin/route.ts in tests/auth-login-flow.test.ts: they pull in
 * next/server. Assertions run against the source instead.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const requestRoute = read("app/auth/otp/request/route.ts");
const verifyRoute = read("app/auth/otp/verify/route.ts");

test("otp/request fails closed, guards its origin, and never creates an account", () => {
  assert.match(requestRoute, /readOriginHeaders\(request\.headers\)/);
  assert.match(requestRoute, /isTrustedRequestOrigin\(/);
  assert.match(requestRoute, /status: 403/);

  assert.match(requestRoute, /if \(!supabase\)/);
  assert.match(requestRoute, /reason: "auth-unavailable"[\s\S]*?status: 503/);

  assert.match(requestRoute, /signInWithOtp/);
  // A code must never be able to provision a new account; /auth/signup is the
  // only self-service path in.
  assert.match(requestRoute, /shouldCreateUser:\s*false/);
});

test("otp/request cannot be used to enumerate which emails have accounts", () => {
  // Supabase answers "Signups not allowed for otp" for an unknown address with
  // shouldCreateUser: false. That must be folded into the same ok response a
  // known address gets, not surfaced as a distinguishable error.
  assert.match(requestRoute, /isUnknownAccountError/);
  assert.match(requestRoute, /signups not allowed/i);

  const okAt = requestRoute.indexOf("return NextResponse.json({ ok: true })");
  const unknownCheckAt = requestRoute.indexOf("if (error && !isUnknownAccountError(error.message))");
  assert.ok(okAt > -1 && unknownCheckAt > -1);
  assert.ok(unknownCheckAt < okAt, "the enumeration guard must run before the success response");
});

test("otp/verify fails closed, guards its origin, and resolves the admin role like /auth/signin", () => {
  assert.match(verifyRoute, /readOriginHeaders\(request\.headers\)/);
  assert.match(verifyRoute, /isTrustedRequestOrigin\(/);
  assert.match(verifyRoute, /status: 403/);

  assert.match(verifyRoute, /if \(!supabase\)/);
  assert.match(verifyRoute, /reason: "auth-unavailable"[\s\S]*?status: 503/);

  assert.match(verifyRoute, /verifyOtp\(\{ email, token, type: "email" \}\)/);

  // Same rule as /auth/signin and getAuthoritySession(): role comes from
  // profiles, never from client-writable user_metadata.
  assert.match(verifyRoute, /from\("profiles"\)/);
  assert.match(verifyRoute, /isAdminRole/);
  assert.doesNotMatch(
    verifyRoute,
    /user_metadata\s*[.?[]/,
    "role must never be read from client-writable metadata",
  );
  assert.match(verifyRoute, /reason: "not-authorized"[\s\S]*?status: 403/);
});

test("otp/verify rejects a malformed code before calling Supabase", () => {
  assert.match(verifyRoute, /OTP_CODE_PATTERN\s*=\s*\/\^\\d\{6,10\}\$\/;/);
  const patternCheckAt = verifyRoute.indexOf("if (!OTP_CODE_PATTERN.test(token))");
  const verifyCallAt = verifyRoute.indexOf("supabase.auth.verifyOtp(");
  assert.ok(patternCheckAt > -1 && verifyCallAt > -1);
  assert.ok(patternCheckAt < verifyCallAt, "the shape check must run before Supabase is asked to verify it");
});
