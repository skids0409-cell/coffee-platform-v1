import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

type Setting = { key: string; value: unknown };

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { connected: false, launchMarket: "IQ-BGD", publicLaunch: false, reason: "not_configured" },
      { status: 503 },
    );
  }

  try {
    const rows = await supabaseRest<Setting[]>(
      "platform_settings?select=key,value&key=in.(launch_market_code,public_launch_enabled,green_coffee_enabled,roasting_machines_enabled,commerce_mode,directory_mode)",
    );
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return Response.json({
      connected: true,
      launchMarket: settings.launch_market_code ?? "IQ-BGD",
      publicLaunch: settings.public_launch_enabled === true,
      greenCoffee: settings.green_coffee_enabled === true,
      roastingMachines: settings.roasting_machines_enabled === true,
      commerceMode: settings.commerce_mode ?? "internal_seller_pages",
      directoryMode: settings.directory_mode ?? "curated_verified",
    });
  } catch (error) {
    console.error("platform-status", error);
    return Response.json(
      { connected: false, launchMarket: "IQ-BGD", publicLaunch: false, reason: "upstream_error" },
      { status: 502 },
    );
  }
}
