import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

/**
 * Guards the two module boundaries that silently break production.
 *
 * The Render cron jobs and workers execute TypeScript directly with `tsx`.
 * There is no bundler and no `react-server` export condition, so importing the
 * "server-only" package throws at load. A module reachable from scripts/ or
 * workers/ must therefore never be marked server-only, and secrets must never
 * reach a client component.
 */
const root = process.cwd();

const IMPORT_RE =
  /^\s*(?:import|export)\b[^;]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function resolveSpec(spec: string, origin: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(origin), spec);
  else return null; // bare package

  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function importsOf(path: string): string[] {
  const found: string[] = [];
  for (const match of read(path).matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (spec) found.push(spec);
  }
  return found;
}

function isServerOnly(path: string): boolean {
  return /^import "server-only";/m.test(read(path));
}

function isClientModule(path: string): boolean {
  return /^\s*["']use client["']/.test(read(path));
}

function entryPoints(): string[] {
  const out: string[] = [];
  for (const dir of ["scripts", "workers"]) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full)) {
      if (name.endsWith(".ts")) out.push(join(full, name));
    }
  }
  return out.sort();
}

/** Every module reachable from `entry`, excluding the entry itself. */
function reachable(entry: string): string[] {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const spec of importsOf(current)) {
      const next = resolveSpec(spec, current);
      if (next) stack.push(next);
    }
  }
  seen.delete(entry);
  return [...seen];
}

test("no cron job or worker imports a server-only module", () => {
  const entries = entryPoints();
  assert.ok(entries.length > 0, "expected scripts/ and workers/ entry points");

  const offenders: string[] = [];
  for (const entry of entries) {
    for (const module of reachable(entry)) {
      if (isServerOnly(module)) {
        offenders.push(`${relative(root, entry)} -> ${relative(root, module)}`);
      }
    }
  }

  assert.deepEqual(
    [...new Set(offenders)].sort(),
    [],
    'These scheduled jobs import a "server-only" module and will throw at startup under tsx.',
  );
});

test("no client component reaches a privileged server module", () => {
  const privileged = ["lib/seo/db.ts", "lib/supabase/server.ts", "lib/authority/auth.ts"];

  function walk(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === "node_modules" || name.name.startsWith(".")) continue;
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full, out);
      else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
    }
    return out;
  }

  const offenders: string[] = [];
  for (const file of [...walk(join(root, "app")), ...walk(join(root, "lib"))]) {
    if (!isClientModule(file)) continue;
    for (const module of reachable(file)) {
      const rel = relative(root, module);
      if (privileged.includes(rel)) offenders.push(`${relative(root, file)} -> ${rel}`);
    }
  }

  assert.deepEqual(
    [...new Set(offenders)].sort(),
    [],
    "A client component reaches a module that reads server-side credentials.",
  );
});

test("the service role key is never referenced from a public-prefixed variable", () => {
  const source = read(join(root, "lib/seo/db.ts"));
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  // A NEXT_PUBLIC_ fallback would inline the value into the client bundle.
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});
