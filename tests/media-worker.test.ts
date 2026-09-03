import assert from "node:assert/strict";
import test from "node:test";
import { buildKodexMediaPrompt } from "../lib/media/brand";

test("Kodex media prompt keeps founder-review and evidence guardrails", () => {
  const prompt = buildKodexMediaPrompt({
    title: "EU enforcement update",
    brief: "Explain a verified enforcement event without overstating the regulator's findings",
    kind: "image",
    aspectRatio: "1:1",
  });

  assert.match(prompt, /Kodex Compliance Authority Engine/);
  assert.match(prompt, /draft for founder review/i);
  assert.match(prompt, /Avoid fake regulator logos/i);
  assert.match(prompt, /1:1/);
});
