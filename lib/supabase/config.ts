export interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
}

/**
 * Returns the public Supabase auth credentials, or null when the deployment has
 * not been configured. Callers must treat null as "authentication unavailable"
 * and deny access — never as "allow anonymous access".
 */
export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const ADMIN_ROLES = ["admin", "administrator", "owner", "founder"] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (ADMIN_ROLES as readonly string[]).includes(role.trim().toLowerCase());
}
