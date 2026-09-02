export const dynamic = "force-dynamic";

export function GET() {
  const configured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
  );

  return Response.json(
    {
      status: configured ? "ok" : "not_configured",
      runtime: "node",
    },
    {
      status: configured ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
