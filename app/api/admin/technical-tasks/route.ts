import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TechnicalTask = {
  id: string;
  task_code: string;
  title: string;
  status: string;
  assigned_to: string | null;
  source_request_id: string | null;
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ created: false, reason: "cross_origin" }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ created: false, reason: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { requestId?: string; title?: string } | null;
  const requestId = String(body?.requestId || "");
  const title = String(body?.title || "").trim().slice(0, 240);
  if (!UUID.test(requestId) || title.length < 3) return Response.json({ created: false, reason: "invalid_input" }, { status: 400 });

  try {
    const result = await adminRest<{ created?: boolean; task?: TechnicalTask }>(admin.token, "rpc/admin_create_support_technical_task", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ p_request_id: requestId, p_title: title }),
    });
    return Response.json({ created: true, task: result?.task || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("support_request_not_found")) return Response.json({ created: false, reason: "not_found" }, { status: 404 });
    if (message.includes("technical_task_title_required")) return Response.json({ created: false, reason: "invalid_input" }, { status: 400 });
    console.error("technical-task-create", message);
    return Response.json({ created: false, reason: "upstream_error" }, { status: 502 });
  }
}
