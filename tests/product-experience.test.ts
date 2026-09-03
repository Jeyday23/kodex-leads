import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function appRouteExists(href: string): boolean {
  if (href.startsWith("/api/")) return existsSync(join(root, "app", href.slice(1), "route.ts"));
  return existsSync(join(root, "app", href.slice(1), "page.tsx"));
}

test("primary navigation points to real routes", () => {
  const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  const hrefs = [...layout.matchAll(/<Link\s+href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.includes("/tutorial"));
  for (const href of hrefs) {
    assert.equal(appRouteExists(href), true, `Missing route for ${href}`);
  }
});

test("Authority workspace navigation points to real pages", () => {
  const layout = readFileSync(join(root, "app/admin/authority/layout.tsx"), "utf8");
  const hrefs = [...layout.matchAll(/\["[^"]+",\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 8);
  for (const href of hrefs) {
    assert.equal(appRouteExists(href), true, `Missing Authority route for ${href}`);
  }
});

test("modern loading, recovery and walkthrough surfaces are installed", () => {
  const required = [
    "app/loading.tsx",
    "app/admin/loading.tsx",
    "app/admin/authority/loading.tsx",
    "app/error.tsx",
    "app/tutorial/page.tsx",
    "app/components/ProductTour.tsx",
    "app/components/KodexSkeleton.tsx",
  ];
  for (const path of required) {
    assert.equal(existsSync(join(root, path)), true, `Missing experience file ${path}`);
  }
});

test("walkthrough documents the autonomy safety sequence", () => {
  const tutorial = readFileSync(join(root, "app/tutorial/page.tsx"), "utf8");
  assert.match(tutorial, /Draft only/);
  assert.match(tutorial, /Run one controlled cycle/);
  assert.match(tutorial, /master stop/i);
  assert.match(tutorial, /Guarded/);
  assert.match(tutorial, /Controlled/);
});
