import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getProfile, updateProfile } from "@/lib/growth/brain/store";

const icpSchema = z.object({
  targetVerticals: z.array(z.string().min(1)).optional(),
  companySizes: z.array(z.string().min(1)).optional(),
  geographies: z.array(z.string().min(1)).optional(),
  championRoles: z.array(z.string().min(1)).optional(),
  userRoles: z.array(z.string().min(1)).optional(),
  buyingRoles: z.array(z.string().min(1)).optional(),
});

const profileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  oneLineDescription: z.string().min(1).max(500).optional(),
  website: z.string().min(1).max(300).optional(),
  vertical: z.string().min(1).max(300).optional(),
  headquarters: z.string().min(1).max(200).optional(),
  marketSummary: z.string().min(1).max(1000).optional(),
  icp: icpSchema.optional(),
  salesLanguageRules: z.array(z.string().min(1)).max(30).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await getProfile());
}

export async function PUT(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid profile payload.", 400);

  const result = await updateProfile(parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
