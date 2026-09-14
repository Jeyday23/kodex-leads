import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/029_auth_boundary_hardening.sql"),
  "utf8",
);

test("profile provisioning cannot be called as a public RPC", () => {
  assert.match(sql, /revoke execute[\s\S]*from public/i);
  assert.match(sql, /revoke execute[\s\S]*from anon/i);
  assert.match(sql, /revoke execute[\s\S]*from authenticated/i);
  assert.match(sql, /set search_path = ''/i);
});

test("profile self-access is limited to authenticated owners", () => {
  const policies = sql.match(/create policy[\s\S]*?;/gi) ?? [];
  assert.equal(policies.length, 2);
  for (const policy of policies) {
    assert.match(policy, /to authenticated/i);
    assert.match(policy, /\(select auth\.uid\(\)\) = id/i);
  }
  assert.match(policies.find((policy) => /for update/i.test(policy)) ?? "", /with check/i);
});

test("hardening preserves the auth trigger and profile data", () => {
  assert.doesNotMatch(sql, /drop trigger|drop function|delete from|truncate/i);
});
