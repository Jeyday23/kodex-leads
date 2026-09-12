import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { seedBrainFromWebsite } from "@/lib/growth/brain/seed-from-website";

const seedSchema = z.object({
  url: z.string().min(1).max(500),
});

/**
 * Proposes a Brain bundle from a company website. Never writes: the caller
 * must POST the returned proposal to /api/growth/brain/seed/apply to persist
 * it, per the WS1 brief's confirmation-step requirement.
 */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = seedSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid seed request: provide a website url.", 400);

  const currentBundle = await getBrainContextBundle();
  const result = await seedBrainFromWebsite({ url: parsed.data.url }, currentBundle);

  if (result.status === "failed") {
    return apiError(result.detail ?? "Could not seed a proposal from that website.", 502);
  }

  return apiSuccess(result);
}
