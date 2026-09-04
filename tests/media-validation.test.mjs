import assert from "node:assert/strict";
import test from "node:test";
import { detectExactMime, sanitizePublicDerivative, sha256Hex, validateMedia } from "../lib/media-validation.mjs";

const u32=(value)=>Uint8Array.of((value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255);
const chunk=(kind,payload)=>new Uint8Array([...u32(payload.length),...Buffer.from(kind,"ascii"),...payload,0,0,0,0]);
const png=(width,height,metadata=true)=>new Uint8Array([
  137,80,78,71,13,10,26,10,
  ...chunk("IHDR",new Uint8Array([...u32(width),...u32(height),8,6,0,0,0])),
  ...(metadata?chunk("eXIf",Buffer.from("GPS latitude","ascii")):[]),
  ...chunk("IEND",new Uint8Array()),
]);

test("detects exact signatures instead of trusting extensions",()=>{
  assert.equal(detectExactMime(png(800,600)),"image/png");
  assert.equal(detectExactMime(new Uint8Array([0x89,0x50,0x4e])),null);
});

test("accepts a purpose-compliant image and strips PNG metadata",async()=>{
  const original=png(800,600,true);
  const result=await validateMedia(original,"master_product","image/png");
  assert.equal(result.passed,true);
  assert.equal(result.width,800);
  assert.equal(result.height,600);
  assert.match(result.sha256Hex,/^[0-9a-f]{64}$/);
  assert.equal(Buffer.from(result.sanitizedBytes).includes(Buffer.from("eXIf")),false);
  assert.ok(result.sanitizedByteSize < original.length);
});

test("rejects MIME mismatch and dimensions below the profile",async()=>{
  const wrongMime=await validateMedia(png(800,600),"master_product","image/jpeg");
  assert.deepEqual(wrongMime.rejectionCodes,["mime_mismatch"]);
  const tooSmall=await validateMedia(png(799,599),"master_product","image/png");
  assert.ok(tooSmall.rejectionCodes.includes("dimensions_below_minimum"));
});

test("checksum is deterministic and changes with immutable original bytes",async()=>{
  const first=png(800,600,true);
  const second=png(800,600,false);
  assert.equal(await sha256Hex(first),await sha256Hex(first));
  assert.notEqual(await sha256Hex(first),await sha256Hex(second));
});

test("rejects unsafe AVIF metadata instead of publishing it unstripped",()=>{
  const avif=new Uint8Array([...u32(24),...Buffer.from("ftypavif","ascii"),0,0,0,0,...Buffer.from("Exif","ascii"),0,0,0,0]);
  assert.throws(()=>sanitizePublicDerivative(avif,"image/avif"),/metadata_not_safely_removable/);
});
