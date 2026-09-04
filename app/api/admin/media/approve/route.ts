import { requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";

const SUPABASE_URL = process.env.SUPABASE_URL;
const validId = (value:string)=>/^[0-9a-f-]{36}$/i.test(value);

export async function POST(request:Request) {
  if(!sameOrigin(request)) return Response.json({ approved:false },{status:403});
  const admin=await requireStaff(request,["verifier","admin"]).catch(()=>null);
  if(!admin) return Response.json({ approved:false },{status:401});
  const body=await request.json().catch(()=>null) as {assetId?:string}|null;
  const assetId=String(body?.assetId||"");
  if(!validId(assetId)) return Response.json({approved:false,reason:"invalid_asset"},{status:400});
  let prepared:{sanitized_storage_path:string;published_storage_path:string;detected_mime:string}|null=null;
  try {
    const publication=await mediaRpc<{sanitized_storage_path:string;published_storage_path:string;detected_mime:string}|null>(admin.token,"admin_media_prepare_publication",{p_asset_id:assetId});
    if(!publication?.sanitized_storage_path || !publication.published_storage_path || !publication.detected_mime) throw new Error("publication_not_prepared");
    prepared=publication;
    const derivative=await mediaStorageRequest(admin.token,`object/media-derivatives/${prepared.sanitized_storage_path}`,{method:"GET"});
    if(!derivative.ok) throw new Error(`derivative_missing_${derivative.status}`);
    const upload=await mediaStorageRequest(admin.token,`object/public-media/${prepared.published_storage_path}`,{method:"POST",headers:{"content-type":prepared.detected_mime,"x-upsert":"false","cache-control":"public, max-age=31536000, immutable"},body:await derivative.arrayBuffer()});
    if(!upload.ok) throw new Error(`publication_upload_${upload.status}:${(await upload.text()).slice(0,120)}`);
    const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/public-media/${prepared.published_storage_path}`;
    const finalized=await mediaRpc<Record<string,unknown>>(admin.token,"admin_media_finalize_publication",{p_asset_id:assetId,p_public_url:publicUrl});
    return Response.json({approved:true,...finalized});
  } catch(error) {
    if(prepared) await mediaRpc(admin.token,"admin_media_cancel_publication",{p_asset_id:assetId,p_reason:"public derivative upload/finalize failed"}).catch(()=>null);
    console.error("admin-media-approve",error instanceof Error?error.message:error);
    return Response.json({approved:false,reason:mapMediaError(error)},{status:502});
  }
}
