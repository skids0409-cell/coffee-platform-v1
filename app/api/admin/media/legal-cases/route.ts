import { requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { mapMediaError, mediaRpc } from "@/lib/media-vault";

const validId=(value:string)=>/^[0-9a-f-]{36}$/i.test(value);
const noticeTypes=new Set(["copyright","trademark","privacy","publicity","other"]);

export async function POST(request:Request){
  if(!sameOrigin(request)) return Response.json({created:false},{status:403});
  const admin=await requireStaff(request).catch(()=>null);
  if(!admin) return Response.json({created:false},{status:401});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const assetId=String(body?.assetId||"");
  const noticeType=String(body?.noticeType||"");
  const email=String(body?.claimantEmail||"").trim().toLowerCase();
  if(!validId(assetId)||!noticeTypes.has(noticeType)||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({created:false,reason:"invalid_notice"},{status:400});
  if(body?.goodFaithStatement!==true||body?.accuracyStatement!==true) return Response.json({created:false,reason:"notice_attestation_required"},{status:400});
  const required=["claimantName","claimantAuthority","claimedWork","complaintText","electronicSignature"];
  if(required.some(key=>String(body?.[key]||"").trim().length<2)) return Response.json({created:false,reason:"notice_fields_required"},{status:400});
  try{
    const result=await mediaRpc<Record<string,unknown>>(admin.token,"admin_media_open_legal_case",{p_payload:{asset_id:assetId,notice_type:noticeType,claimant_name:body?.claimantName,claimant_email:email,claimant_authority:body?.claimantAuthority,claimed_work:body?.claimedWork,complaint_text:body?.complaintText,jurisdiction:body?.jurisdiction,evidence:Array.isArray(body?.evidence)?body?.evidence:[],good_faith_statement:true,accuracy_statement:true,electronic_signature:body?.electronicSignature}});
    return Response.json({created:true,...result});
  }catch(error){
    console.error("admin-media-legal-case",error instanceof Error?error.message:error);
    return Response.json({created:false,reason:mapMediaError(error)},{status:502});
  }
}
