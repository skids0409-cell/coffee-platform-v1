import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";
import { validateMedia } from "@/lib/media-validation.mjs";

const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);
const extensionForMime: Record<string,string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif" };

type IntentRow = { id:string; purpose:string; quarantine_path:string; declared_mime:string; max_bytes:number; status:string; expires_at:string; uploaded_by:string };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ validated:false },{ status:403 });
  const admin = await requireStaff(request).catch(()=>null);
  if (!admin) return Response.json({ validated:false },{ status:401 });
  const body = await request.json().catch(()=>null) as { intentId?:string } | null;
  const intentId = String(body?.intentId || "");
  if (!validId(intentId)) return Response.json({ validated:false,reason:"invalid_intent" },{ status:400 });
  try {
    const intents = await adminRest<IntentRow[]>(admin.token,`media_upload_intents?select=id,purpose,quarantine_path,declared_mime,max_bytes,status,expires_at,uploaded_by&id=eq.${intentId}&uploaded_by=eq.${admin.user.id}&limit=1`);
    const intent = intents[0];
    if (!intent || intent.status!=="created" || new Date(intent.expires_at).getTime()<=Date.now()) return Response.json({ validated:false,reason:"intent_not_active" },{ status:409 });
    const original = await mediaStorageRequest(admin.token,`object/media-quarantine/${intent.quarantine_path}`,{ method:"GET" });
    if (!original.ok) return Response.json({ validated:false,reason:"quarantine_object_missing" },{ status:409 });
    const contentLength = Number(original.headers.get("content-length") || 0);
    if (contentLength > intent.max_bytes) return Response.json({ validated:false,reason:"file_too_large",maxBytes:intent.max_bytes,receivedBytes:contentLength },{ status:400 });
    const bytes = new Uint8Array(await original.arrayBuffer());
    const result = await validateMedia(bytes,intent.purpose,intent.declared_mime);
    const duplicateRows = result.sha256Hex ? await adminRest<Array<{id:string}>>(admin.token,`media_assets?select=id&sha256_hex=eq.${result.sha256Hex}&technical_status=eq.passed&duplicate_of_asset_id=is.null&limit=1`) : [];
    const duplicateOf = duplicateRows[0]?.id || null;
    let sanitizedPath:string|null = null;
    if (result.passed && !duplicateOf && result.sanitizedBytes && result.detectedMime) {
      sanitizedPath=`sanitized/${intent.id}/asset.${extensionForMime[result.detectedMime]}`;
      const upload = await mediaStorageRequest(admin.token,`object/media-derivatives/${sanitizedPath}`,{ method:"POST",headers:{"content-type":result.detectedMime,"x-upsert":"false","cache-control":"no-store"},body:result.sanitizedBytes });
      if (!upload.ok) throw new Error(`derivative_upload_${upload.status}:${(await upload.text()).slice(0,120)}`);
    }
    const completed = await mediaRpc<Record<string,unknown>>(admin.token,"admin_media_complete_validation",{ p_intent_id:intent.id,p_report:{
      passed:result.passed,detected_mime:result.detectedMime,byte_size:result.byteSize,width:result.width,height:result.height,page_count:result.pageCount,
      sha256_hex:result.sha256Hex,sanitized_storage_path:sanitizedPath,sanitized_byte_size:result.sanitizedByteSize,duplicate_of_asset_id:duplicateOf,rejection_codes:result.rejectionCodes,
      declared_mime:intent.declared_mime,policy_version:"phase3-v1",metadata_removed:Boolean(result.sanitizedBytes),
    }});
    const technicalStatus=String(completed.technical_status||"");
    return Response.json({ validated:technicalStatus!=="rejected",...completed },{status:technicalStatus==="rejected"?422:202});
  } catch(error) {
    console.error("admin-media-validation",error instanceof Error ? error.message : error);
    return Response.json({ validated:false,reason:mapMediaError(error) },{ status:502 });
  }
}
