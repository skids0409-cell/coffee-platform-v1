import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";
import { MEDIA_POLICY_VERSION, validateMedia } from "@/lib/media-validation.mjs";

const extensionForMime: Record<string,string> = {
  "image/jpeg":"jpg",
  "image/png":"png",
  "image/webp":"webp",
  "image/avif":"avif",
};

type LegacyAsset = {
  id:string;
  purpose:string;
  original_storage_path:string;
  declared_mime:string;
  technical_status:string;
  technical_report:Record<string,unknown>;
};

type ReconciliationStart = {
  asset_id:string;
  correlation_id:string;
  derivative_prefix:string;
  original_storage_path:string;
  purpose:string;
  declared_mime:string;
};

type ReconciliationResult = {
  asset_id:string;
  technical_status:string;
  publication_status:string;
  duplicate_of_asset_id:string|null;
  rejection_codes:string[];
};

const encodePath=(value:string)=>value.split("/").map(encodeURIComponent).join("/");

async function reconcileOne(token:string,asset:LegacyAsset):Promise<ReconciliationResult>{
  const started=await mediaRpc<ReconciliationStart>(token,"admin_media_begin_legacy_reconciliation",{p_asset_id:asset.id});
  let derivativePath:string|null=null;
  try{
    const original=await mediaStorageRequest(token,`object/public-media/${encodePath(started.original_storage_path)}`,{method:"GET"});
    if(!original.ok)throw new Error(`legacy_object_fetch_${original.status}`);
    const bytes=new Uint8Array(await original.arrayBuffer());
    const validation=await validateMedia(bytes,started.purpose,started.declared_mime);
    const duplicateRows=validation.passed&&validation.sha256Hex
      ?await adminRest<Array<{id:string}>>(token,`media_assets?select=id&id=neq.${asset.id}&sha256_hex=eq.${validation.sha256Hex}&technical_status=eq.passed&duplicate_of_asset_id=is.null&limit=1`)
      :[];
    const duplicateOf=duplicateRows[0]?.id||null;
    if(validation.passed&&!duplicateOf&&validation.sanitizedBytes&&validation.detectedMime){
      const extension=extensionForMime[validation.detectedMime];
      if(!extension)throw new Error("legacy_derivative_type_unsupported");
      derivativePath=`${started.derivative_prefix}asset.${extension}`;
      const upload=await mediaStorageRequest(token,`object/media-derivatives/${encodePath(derivativePath)}`,{
        method:"POST",
        headers:{"content-type":validation.detectedMime,"x-upsert":"false","cache-control":"private, no-store"},
        body:validation.sanitizedBytes,
      });
      if(!upload.ok)throw new Error(`legacy_derivative_upload_${upload.status}:${(await upload.text()).slice(0,120)}`);
    }
    return await mediaRpc<ReconciliationResult>(token,"admin_media_complete_legacy_reconciliation",{
      p_asset_id:asset.id,
      p_report:{
        passed:validation.passed,
        detected_mime:validation.detectedMime,
        byte_size:validation.byteSize,
        width:validation.width,
        height:validation.height,
        page_count:validation.pageCount,
        sha256_hex:validation.sha256Hex,
        sanitized_storage_path:derivativePath,
        sanitized_byte_size:validation.sanitizedByteSize,
        rejection_codes:validation.rejectionCodes,
        declared_mime:started.declared_mime,
        policy_version:MEDIA_POLICY_VERSION,
        reconciliation_version:"phase4-legacy-v1",
        correlation_id:started.correlation_id,
        metadata_removed:Boolean(validation.sanitizedBytes),
        original_bucket:"public-media",
      },
    });
  }catch(error){
    if(derivativePath){
      await mediaStorageRequest(token,`object/media-derivatives/${encodePath(derivativePath)}`,{method:"DELETE"}).catch(()=>null);
    }
    const reason=error instanceof Error?error.message:String(error);
    await mediaRpc(token,"admin_media_fail_legacy_reconciliation",{p_asset_id:asset.id,p_reason:reason}).catch(()=>null);
    throw error;
  }
}

export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({reconciled:false,reason:"cross_origin"},{status:403});
  const admin=await requireStaff(request,["verifier","admin"]).catch(()=>null);
  if(!admin)return Response.json({reconciled:false,reason:"reviewer_required"},{status:401});
  try{
    const candidates=await adminRest<LegacyAsset[]>(admin.token,"media_assets?select=id,purpose,original_storage_path,declared_mime,technical_status,technical_report&technical_status=eq.validating&order=created_at.asc&limit=100");
    const legacy=candidates.filter((asset)=>asset.technical_report?.migration==="038_phase3_legacy_entity_media_backfill");
    const completed:ReconciliationResult[]=[];
    const failed:Array<{asset_id:string;reason:string}>=[];
    for(const asset of legacy){
      try{completed.push(await reconcileOne(admin.token,asset));}
      catch(error){failed.push({asset_id:asset.id,reason:mapMediaError(error)==="upstream_error"?(error instanceof Error?error.message.slice(0,180):"unknown_error"):mapMediaError(error)});}
    }
    const counts=completed.reduce<Record<string,number>>((total,item)=>{
      total[item.technical_status]=(total[item.technical_status]||0)+1;
      return total;
    },{});
    return Response.json({
      reconciled:failed.length===0,
      attempted:legacy.length,
      completed:completed.length,
      failed,
      counts,
      results:completed,
      rights_notice:"Technical reconciliation does not create or approve legal rights assertions.",
    },{status:failed.length?207:200,headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("legacy-media-reconciliation",error instanceof Error?error.message:error);
    return Response.json({reconciled:false,reason:mapMediaError(error)},{status:502});
  }
}
