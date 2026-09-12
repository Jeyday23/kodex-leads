import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";

/**
 * Signal configs live only on the Brain bundle (bundle.signalConfigs, per
 * the decisions log ruling), owned by WS1's brain store. This route is a
 * read-only view for the Signals admin page; writing configs happens through
 * the Brain UI once WS1 lands.
 */
export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const bundle = await getBrainContextBundle();
  return apiSuccess(bundle.signalConfigs);
}
