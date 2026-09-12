import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { scoreLeadExplainably } from "@/lib/growth/leads/explainable-score";
import { buildLeadRationale } from "@/lib/growth/leads/rationale";
import { storeLeadScore } from "@/lib/growth/leads/store";

const scoreSchema = z.object({
  leadRef: z.string().min(1).max(200),
  leadTable: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200),
  personTitle: z.string().max(200).optional(),
  companyVertical: z.string().max(200).optional(),
  geography: z.string().max(200).optional(),
  companySize: z.string().max(50).optional(),
  signalStrength: z.number().min(0).max(1).optional(),
  signalDetectedAt: z.string().datetime().optional(),
  employerRelationship: z.enum(["target", "partner", "competitor", "unknown"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = scoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid lead score payload.", 400);

  const { leadRef, leadTable, companyName, ...scoreInput } = parsed.data;
  const bundle = await getBrainContextBundle();
  const score = scoreLeadExplainably(scoreInput, bundle);
  const rationale = await buildLeadRationale(score, companyName);
  const stored = await storeLeadScore(leadRef, leadTable, score, rationale.rationale);

  return apiSuccess({ ...score, rationale: rationale.rationale, rationaleSource: rationale.source, stored });
}
