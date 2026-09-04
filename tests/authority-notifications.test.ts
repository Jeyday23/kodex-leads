import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createNotification, notificationRow } from "../lib/authority/notifications";

/** Columns declared by supabase/migrations/012_authority_operational_modules.sql. */
const TABLE_COLUMNS = ["id", "category", "severity", "title", "body", "entity_type", "entity_id", "read_at", "created_at"];

function stubClient(response: { error: { message: string } | null }) {
  const inserted: Array<Record<string, unknown>> = [];
  const tables: string[] = [];
  return {
    inserted,
    tables,
    client: {
      from(table: string) {
        tables.push(table);
        return {
          async insert(row: Record<string, unknown>) {
            inserted.push(row);
            return response;
          },
        };
      },
    },
  };
}

test("the migration is the source of truth for the notification columns", () => {
  const migration = readFileSync("supabase/migrations/012_authority_operational_modules.sql", "utf8");
  const table = migration.slice(migration.indexOf("create table if not exists authority_notifications"));
  const definition = table.slice(0, table.indexOf(");"));
  for (const column of TABLE_COLUMNS) {
    assert.match(definition, new RegExp(`\\b${column}\\b`), `migration is missing ${column}`);
  }
  // The columns the broken helper used have never existed in this repository.
  for (const absent of ["notification_type", "message", "payload"]) {
    assert.doesNotMatch(definition, new RegExp(`\\b${absent}\\b`), `migration unexpectedly declares ${absent}`);
  }
});

test("the row maps onto the production column names and nothing else", () => {
  const row = notificationRow({
    category: "content_ready_for_approval",
    severity: "warning",
    title: "Content ready for approval",
    body: "Asset requires admin approval.",
    entityType: "asset",
    entityId: "abc",
  });
  assert.deepEqual(row, {
    category: "content_ready_for_approval",
    severity: "warning",
    title: "Content ready for approval",
    body: "Asset requires admin approval.",
    entity_type: "asset",
    entity_id: "abc",
  });
  // Regression guard for Postgres 42703 in production.
  for (const key of Object.keys(row)) assert.ok(TABLE_COLUMNS.includes(key), `${key} is not a column on the table`);
});

test("optional fields become null rather than being omitted or invented", () => {
  const row = notificationRow({ category: "discovery", severity: "info", title: "Discovery run completed" });
  assert.equal(row.body, null);
  assert.equal(row.entity_type, null);
  assert.equal(row.entity_id, null);
});

test("a successful insert reports ok and writes to authority_notifications", async () => {
  const stub = stubClient({ error: null });
  const result = await createNotification(
    { category: "content_asset_created", severity: "info", title: "Authority content asset created", body: "A title" },
    stub.client,
  );
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(stub.tables, ["authority_notifications"]);
  assert.equal(stub.inserted.length, 1);
  assert.deepEqual(stub.inserted[0], {
    category: "content_asset_created",
    severity: "info",
    title: "Authority content asset created",
    body: "A title",
    entity_type: null,
    entity_id: null,
  });
});

test("a database failure is reported and logged, never swallowed", async () => {
  const stub = stubClient({ error: { message: 'column "notification_type" does not exist' } });
  const previous = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  let result;
  try {
    result = await createNotification({ category: "content_approved", severity: "info", title: "Content approved" }, stub.client);
  } finally {
    console.error = previous;
  }
  assert.equal(result.ok, false);
  assert.match(String(result.ok === false ? result.error : ""), /notification_type/);
  assert.equal(logs.length, 1);
  const logged = JSON.parse(logs[0]) as Record<string, unknown>;
  assert.equal(logged.scope, "authority-notification");
  assert.equal(logged.status, "failed");
  assert.equal(logged.category, "content_approved");
  // Titles and bodies can carry draft or lead content and stay out of the log.
  assert.ok(!("title" in logged));
  assert.ok(!("body" in logged));
});

test("a thrown client error is caught and reported rather than failing the job", async () => {
  const throwing = {
    from() {
      return {
        async insert(): Promise<{ error: { message: string } | null }> {
          throw new Error("connection reset");
        },
      };
    },
  };
  const previous = console.error;
  console.error = () => {};
  let result;
  try {
    result = await createNotification({ category: "discovery", severity: "info", title: "Discovery run completed" }, throwing);
  } finally {
    console.error = previous;
  }
  assert.equal(result.ok, false);
  assert.match(String(result.ok === false ? result.error : ""), /connection reset/);
});

test("an unconfigured database reports the failure instead of pretending to write", async () => {
  const previous = console.error;
  console.error = () => {};
  let result;
  try {
    result = await createNotification({ category: "discovery", severity: "info", title: "Discovery run completed" }, null);
  } finally {
    console.error = previous;
  }
  assert.equal(result.ok, false);
});

test("the autonomy run reports notification failures instead of reporting plain success", () => {
  const engine = readFileSync("lib/authority/autonomous-ranking.ts", "utf8");

  // The broken insert must be gone for good.
  assert.doesNotMatch(engine, /notification_type:/);
  assert.doesNotMatch(engine, /payload: \{\}/);
  assert.doesNotMatch(engine, /from\("authority_notifications"\)/);

  // The three writers on the draft-only path hand their result back.
  assert.match(engine, /const notification = await createNotification\("content_asset_created"/);
  assert.match(engine, /const notification = await createNotification\("content_ready_for_validation"/);
  assert.match(engine, /return createNotification\("content_ready_for_approval"/);

  // runAutopilot collects them and puts them in the job result.
  assert.match(engine, /const notificationFailures: Array<\{ stage: string; error: string \}> = \[\]/);
  assert.match(engine, /recordNotification\("select", created\)/);
  assert.match(engine, /recordNotification\("draft", generated\)/);
  assert.match(engine, /recordNotification\("validate", validated\)/);
  assert.match(engine, /notificationFailures,/);
});

test("both notification writers go through the single shared module", () => {
  const opportunities = readFileSync("lib/authority/opportunities.ts", "utf8");
  assert.doesNotMatch(opportunities, /from\("authority_notifications"\)/);
  assert.match(opportunities, /createNotification\(\{ category, severity, title, body \}\)/);

  const notifications = readFileSync("lib/authority/notifications.ts", "utf8");
  assert.match(notifications, /from\("authority_notifications"\)/);
});

test("the draft-only autonomy behaviour is untouched by this fix", () => {
  const engine = readFileSync("lib/authority/autonomous-ranking.ts", "utf8");
  // Publication still requires guarded, controlled or an explicit acceptance run.
  assert.match(engine, /mode === "guarded" \|\| mode === "controlled" \|\| options\.acceptance/);
  // The scheduled job still pins draft_only regardless of the stored mode.
  const job = readFileSync("scripts/run-authority-research-and-drafting.ts", "utf8");
  assert.match(job, /modeOverride: "draft_only"/);
  assert.match(job, /skipScheduledAutonomy\(service\)/);
});
