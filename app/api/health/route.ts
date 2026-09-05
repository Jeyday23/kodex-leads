// Render injects these at build and runtime. They are absent locally and in CI,
// so every field is optional and the endpoint never fails because of them.
// commit is what makes a deploy verifiable: without it a 200 from this route
// proves the service is up but says nothing about which code is running.
const commit = process.env.RENDER_GIT_COMMIT ?? null;

export async function GET() {
  return Response.json({
    status: "ok",
    service: "kodex-leads",
    commit,
    commitShort: commit ? commit.slice(0, 7) : null,
    branch: process.env.RENDER_GIT_BRANCH ?? null,
    checkedAt: new Date().toISOString(),
  });
}
