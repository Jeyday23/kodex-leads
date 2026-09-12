import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { classifyManualSignal } from "@/lib/growth/signals/providers/manual";
import { storeSignalEvents } from "@/lib/growth/signals/store";

const manualSchema = z.object({
  text: z.string().min(4).max(5000),
  url: z.string().url().max(2000).optional(),
  companyName: z.string().max(200).optional(),
  companyDomain: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = manualSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid manual signal payload.", 400);

  const bundle = await getBrainContextBundle();
  const events = classifyManualSignal(parsed.data, bundle);
  const stored = await storeSignalEvents(events);

  return apiSuccess({ eventsFound: events.length, events, ...stored });
}
