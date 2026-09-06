import { adminRest, requireStaff } from "@/lib/supabase-admin";

type WorkSource = "quality" | "rights" | "support" | "partner";

type WorkItem = {
  key: string;
  source: WorkSource;
  sourceId: string;
  reference: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  deepLink: string;
};

const closedStatus = new Set(["resolved", "closed", "approved", "rejected", "archived", "cancelled"]);

const active = (status: string) => !closedStatus.has(status.toLowerCase());

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });

  try {
    const [quality, rights, support, partner] = await Promise.all([
      adminRest<Array<{ id: string; entity_table: string | null; entity_id: string | null; issue_code: string; issue_type: string | null; severity: string; message_ar: string; status: string; assigned_to: string | null; created_at: string; updated_at: string }>>(
        admin.token,
        "data_quality_issues?select=id,entity_table,entity_id,issue_code,issue_type,severity,message_ar,status,assigned_to,created_at,updated_at&order=updated_at.desc&limit=150",
      ),
      adminRest<Array<{ id: string; public_reference: string; request_type: string; status: string; requester_name: string; target_reference_text: string | null; details: string; assigned_to: string | null; created_at: string; updated_at: string }>>(
        admin.token,
        "rights_requests?select=id,public_reference,request_type,status,requester_name,target_reference_text,details,assigned_to,created_at,updated_at&order=updated_at.desc&limit=100",
      ),
      adminRest<Array<{ id: string; public_reference: string; request_type: string; subject: string; message: string; status: string; priority: string; assigned_to: string | null; created_at: string; updated_at: string }>>(
        admin.token,
        "support_requests?select=id,public_reference,request_type,subject,message,status,priority,assigned_to,created_at,updated_at&order=updated_at.desc&limit=150",
      ),
      adminRest<Array<{ id: string; organization_id: string; entity_type: string; target_entity_id: string | null; status: string; review_note: string | null; reviewed_by: string | null; created_at: string; updated_at: string }>>(
        admin.token,
        "partner_submissions?select=id,organization_id,entity_type,target_entity_id,status,review_note,reviewed_by,created_at,updated_at&order=updated_at.desc&limit=100",
      ),
    ]);

    const items: WorkItem[] = [
      ...quality.filter((row) => active(row.status)).map((row) => ({
        key: `quality:${row.id}`,
        source: "quality" as const,
        sourceId: row.id,
        reference: row.issue_code,
        title: row.message_ar || row.issue_code,
        summary: [row.issue_type, row.entity_table, row.entity_id].filter(Boolean).join(" · "),
        status: row.status,
        priority: row.severity || "normal",
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deepLink: `/operations?workspace=review&quality=${row.id}`,
      })),
      ...rights.filter((row) => active(row.status)).map((row) => ({
        key: `rights:${row.id}`,
        source: "rights" as const,
        sourceId: row.id,
        reference: row.public_reference,
        title: `${row.request_type} · ${row.requester_name}`,
        summary: row.target_reference_text || row.details,
        status: row.status,
        priority: "high",
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deepLink: `/operations?workspace=requests&rights=${row.id}`,
      })),
      ...support.filter((row) => active(row.status)).map((row) => ({
        key: `support:${row.id}`,
        source: "support" as const,
        sourceId: row.id,
        reference: row.public_reference,
        title: row.subject || row.request_type,
        summary: row.message,
        status: row.status,
        priority: row.priority || "normal",
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deepLink: `/operations?workspace=requests&support=${row.id}`,
      })),
      ...partner.filter((row) => active(row.status)).map((row) => ({
        key: `partner:${row.id}`,
        source: "partner" as const,
        sourceId: row.id,
        reference: row.id,
        title: `طلب جهة · ${row.entity_type}`,
        summary: row.review_note || `الجهة ${row.organization_id}`,
        status: row.status,
        priority: "normal",
        assignedTo: row.reviewed_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deepLink: `/operations?workspace=partners&submission=${row.id}`,
      })),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const counts = items.reduce<Record<WorkSource, number>>((result, item) => {
      result[item.source] += 1;
      return result;
    }, { quality: 0, rights: 0, support: 0, partner: 0 });

    return Response.json({
      authenticated: true,
      role: admin.profile.role,
      generatedAt: new Date().toISOString(),
      counts,
      items,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("operational-work-queue-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}
