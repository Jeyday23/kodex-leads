export async function validateUrl(url: string): Promise<{ url: string; ok: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
