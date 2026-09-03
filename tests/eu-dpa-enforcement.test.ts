import test from "node:test";
import assert from "node:assert/strict";
import { parseHtmlAnchors } from "../lib/seo/eu-dpa-enforcement";

test("EU DPA parser handles nested markup and mixed attribute quoting", () => {
  const html = `
    <section class="view-content">
      <a class='result' data-id="1" href='/news/national-news/2026/example_en'>
        Italian SA <strong>fined Example S.p.A.</strong> 120 000 EUR for GDPR violations
      </a>
      <a href="https://www.edpb.europa.eu/news/national-news/2026/other_en" aria-label='case'>
        CNIL imposes an administrative fine on Example France
      </a>
    </section>
  `;
  const anchors = parseHtmlAnchors(html);
  assert.equal(anchors.length, 2);
  assert.equal(anchors[0].href, "/news/national-news/2026/example_en");
  assert.match(anchors[0].text, /fined Example S\.p\.A\. 120 000 EUR/);
  assert.equal(anchors[1].href, "https://www.edpb.europa.eu/news/national-news/2026/other_en");
});

test("EU DPA parser ignores anchors without href and decodes common entities", () => {
  const html = `<a>Missing href</a><a href='/case'>Company &amp; Partner fined €2.5 million</a>`;
  const anchors = parseHtmlAnchors(html);
  assert.deepEqual(anchors, [{ href: "/case", text: "Company & Partner fined €2.5 million" }]);
});
