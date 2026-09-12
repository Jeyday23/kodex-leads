import { getSiteUrl } from "@/lib/seo/config";
import { runSiteAudit } from "@/lib/growth/audit/run-audit";

async function main() {
  const url = getSiteUrl();
  const summary = await runSiteAudit(url);

  console.log(JSON.stringify({
    service: "kodex-growth-site-audit",
    url: summary.url,
    measuredAt: summary.measuredAt,
    storage: summary.storage,
    lighthouse: {
      mobile: { status: summary.lighthouse.mobile.status, performance: summary.lighthouse.mobile.categories.performance },
      desktop: { status: summary.lighthouse.desktop.status, performance: summary.lighthouse.desktop.categories.performance },
    },
    technical: { status: summary.technical.status, httpStatus: summary.technical.httpStatus },
    geoPassing: summary.geo.filter((check) => check.status === "pass").length,
    geoTotal: summary.geo.length,
    issueCount: summary.issues.length,
  }, null, 2));

  const failed =
    summary.lighthouse.mobile.status === "failed" ||
    summary.lighthouse.desktop.status === "failed" ||
    summary.technical.status === "failed";

  if (failed) {
    console.error("kodex-growth-site-audit: one or more audit kinds failed.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
