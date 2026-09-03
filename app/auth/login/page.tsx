import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the private Kodex workspace.",
  robots: { index: false, follow: false },
};

/** Only same-origin relative paths are followed, to prevent open redirects. */
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/admin/authority/command";
  return next;
}

function first(value: string | string[] | undefined): string | null {
  const found = Array.isArray(value) ? value[0] : value;
  return found ?? null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Resolved on the server so the form is present in the initial HTML.
  return <LoginForm next={safeNext(params.next)} reason={first(params.reason)} />;
}
