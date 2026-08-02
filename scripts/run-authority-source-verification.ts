import { checkKnowledgeSource, listKnowledgeSources } from "@/lib/authority/knowledge";

const sources = await listKnowledgeSources();
let checked = 0;
let changed = 0;
let failed = 0;

if (process.env.SEO_SOURCE_FETCH_ENABLED === "true") {
  for (const source of sources.slice(0, 25)) {
    const result = await checkKnowledgeSource(source.id, "render-cron");
    if (result.ok) checked += 1;
    else failed += 1;
    if ("changed" in result && result.changed) changed += 1;
  }
}

console.log(JSON.stringify({
  service: "kodex-authority-source-verification",
  status: process.env.SEO_SOURCE_FETCH_ENABLED === "true" ? "ready" : "disabled",
  sources: sources.length,
  checked,
  changed,
  failed,
}));
