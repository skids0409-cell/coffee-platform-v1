const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export class SupabaseConfigurationError extends Error {}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function supabaseRest<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new SupabaseConfigurationError(
      "Supabase runtime variables are missing",
    );
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Supabase REST ${response.status}: ${detail.slice(0, 240)}`,
    );
  }

  return (await response.json()) as T;
}

export async function supabaseRestInsert(
  table: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new SupabaseConfigurationError(
      "Supabase runtime variables are missing",
    );
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Supabase REST ${response.status}: ${detail.slice(0, 500)}`,
    );
  }
}
