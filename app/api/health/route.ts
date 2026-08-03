export async function GET() {
  return Response.json({
    status: "ok",
    service: "kodex-leads",
    checkedAt: new Date().toISOString(),
  });
}
