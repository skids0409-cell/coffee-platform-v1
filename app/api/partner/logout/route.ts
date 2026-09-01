import { sameOrigin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ signedOut: false }, { status: 403 });
  return new Response(JSON.stringify({ signedOut: true }), { headers: {
    "content-type": "application/json", "cache-control": "no-store",
    "set-cookie": "coffee_partner_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
  }});
}
