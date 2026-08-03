export interface AuthorityListFilters {
  search?: string | null;
  framework?: string | null;
  intent?: string | null;
  country?: string | null;
  language?: string | null;
  status?: string | null;
  source?: string | null;
  sort?: string | null;
}

export function filtersFromUrl(url: string): AuthorityListFilters {
  const params = new URL(url).searchParams;
  return {
    search: params.get("search"),
    framework: params.get("framework"),
    intent: params.get("intent"),
    country: params.get("country"),
    language: params.get("language"),
    status: params.get("status"),
    source: params.get("source"),
    sort: params.get("sort"),
  };
}
