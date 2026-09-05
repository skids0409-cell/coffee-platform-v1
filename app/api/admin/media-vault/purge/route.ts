import { requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

type PurgeObject = { bucket: "media-quarantine"|"media-derivatives"|"public-media"; path: string };
type PreparedPurge = { request_id:string;asset_id:string;objects:PurgeObject[] };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ purged:false,reason:"cross_origin" },{ status:403 });
  const admin=await requireStaff(request).catch(()=>null);
  if (!admin) return Response.json({ purged:false,reason:"unauthorized" },{ status:401 });
  if (admin.profile.role!=="admin") return Response.json({ purged:false,reason:"admin_required" },{ status:403 });
  const body=await request.json().catch(()=>null) as { requestId?:string }|null;
  const requestId=String(body?.requestId||"");
  if (!UUID.test(requestId)) return Response.json({ purged:false,reason:"invalid_input" },{ status:400 });

  let prepared:PreparedPurge|null=null;
  const results:Array<PurgeObject&{status:"deleted"|"missing"|"failed";httpStatus:number}>=[];
  try {
    prepared=await mediaRpc<PreparedPurge>(admin.token,"admin_media_prepare_purge",{p_request_id:requestId});
    for (const object of prepared.objects) {
      const response=await mediaStorageRequest(admin.token,`object/${object.bucket}/${encodePath(object.path)}`,{method:"DELETE"});
      results.push({...object,status:response.ok?"deleted":response.status===404?"missing":"failed",httpStatus:response.status});
    }
    const complete=results.every((item)=>item.status!=="failed");
    const storageResult={complete,objects:results};
    if (!complete) {
      await mediaRpc(admin.token,"admin_media_fail_purge_execution",{p_request_id:requestId,p_storage_result:storageResult});
      return Response.json({purged:false,reason:"storage_purge_incomplete",storage:results},{status:502});
    }
    const result=await mediaRpc<Record<string,unknown>>(admin.token,"admin_media_finalize_purge",{p_request_id:requestId,p_storage_result:storageResult});
    return Response.json({purged:true,result});
  } catch(error) {
    if (prepared) await mediaRpc(admin.token,"admin_media_fail_purge_execution",{p_request_id:requestId,p_storage_result:{complete:false,objects:results}}).catch(()=>null);
    const message=error instanceof Error?error.message:String(error);
    const known=["admin_required","purge_not_approved","asset_not_disposal_eligible","active_links_block_purge","storage_purge_incomplete","asset_no_longer_disposal_eligible","dependent_duplicates_block_purge"].find((code)=>message.includes(code));
    return Response.json({purged:false,reason:known||mapMediaError(error)},{status:known?409:502});
  }
}
