const MiB = 1024 * 1024;

export const MEDIA_POLICY_VERSION = "phase3-v1";

export const MEDIA_PROFILES = Object.freeze({
  master_product: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 800, minHeight: 600, maxWidth: 8000, maxHeight: 8000, maxPixels: 40_000_000, maxBytes: 8 * MiB },
  vendor_offer: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 800, minHeight: 600, maxWidth: 8000, maxHeight: 8000, maxPixels: 40_000_000, maxBytes: 8 * MiB },
  organization_profile: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 512, minHeight: 512, maxWidth: 4096, maxHeight: 4096, maxPixels: 16_000_000, maxBytes: 4 * MiB },
  brand_identity: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 512, minHeight: 512, maxWidth: 4096, maxHeight: 4096, maxPixels: 16_000_000, maxBytes: 4 * MiB },
  editorial: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 1200, minHeight: 675, maxWidth: 10000, maxHeight: 10000, maxPixels: 50_000_000, maxBytes: 12 * MiB },
  origin_evidence: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], minWidth: 800, minHeight: 600, maxWidth: 8000, maxHeight: 8000, maxPixels: 40_000_000, maxBytes: 8 * MiB },
  document_evidence: { mimes: ["application/pdf"], maxBytes: 20 * MiB, maxPages: 200 },
});

const readU16BE = (bytes, offset) => (bytes[offset] << 8) | bytes[offset + 1];
const readU24LE = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
const readU32BE = (bytes, offset) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
const readU32LE = (bytes, offset) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));

export function detectExactMime(bytes) {
  if (bytes.length >= 8 && ascii(bytes, 0, 8) === "\u0089PNG\r\n\u001a\n") return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 64));
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) break;
    const length = readU16BE(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height: readU16BE(bytes, offset + 3), width: readU16BE(bytes, offset + 5) };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes) {
  const kind = ascii(bytes, 12, 4);
  if (kind === "VP8X" && bytes.length >= 30) return { width: 1 + readU24LE(bytes, 24), height: 1 + readU24LE(bytes, 27) };
  if (kind === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: readU16BE(Uint8Array.of(bytes[27], bytes[26]), 0) & 0x3fff, height: readU16BE(Uint8Array.of(bytes[29], bytes[28]), 0) & 0x3fff };
  }
  if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
    return { width: 1 + (((b2 & 0x3f) << 8) | b1), height: 1 + ((b3 << 6) | (b2 >> 2)) };
  }
  return null;
}

function avifDimensions(bytes) {
  for (let offset = 4; offset + 12 <= bytes.length; offset += 1) {
    if (ascii(bytes, offset, 4) === "ispe") {
      const boxStart = offset - 4;
      const boxSize = readU32BE(bytes, boxStart);
      if (boxSize >= 20 && boxStart + boxSize <= bytes.length) return { width: readU32BE(bytes, offset + 8), height: readU32BE(bytes, offset + 12) };
    }
  }
  return null;
}

export function readTechnicalMetadata(bytes, mime) {
  if (mime === "image/png" && bytes.length >= 24 && ascii(bytes, 12, 4) === "IHDR") return { width: readU32BE(bytes, 16), height: readU32BE(bytes, 20) };
  if (mime === "image/jpeg") return jpegDimensions(bytes);
  if (mime === "image/webp") return webpDimensions(bytes);
  if (mime === "image/avif") return avifDimensions(bytes);
  if (mime === "application/pdf") {
    const text = new TextDecoder("latin1").decode(bytes);
    const pages = text.match(/\/Type\s*\/Page(?!s)\b/g)?.length || 0;
    return { pageCount: Math.max(1, pages) };
  }
  return null;
}

function concat(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function sanitizeJpeg(bytes) {
  const parts = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff || offset + 1 >= bytes.length) { parts.push(bytes.subarray(offset)); break; }
    const start = offset++;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xda) { parts.push(bytes.subarray(start)); break; }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { parts.push(bytes.subarray(start, offset)); continue; }
    if (offset + 2 > bytes.length) throw new Error("corrupt_image");
    const length = readU16BE(bytes, offset);
    if (length < 2 || offset + length > bytes.length) throw new Error("corrupt_image");
    const end = offset + length;
    if (![0xe1, 0xed, 0xfe].includes(marker)) parts.push(bytes.subarray(start, end));
    offset = end;
  }
  return concat(parts);
}

function sanitizePng(bytes) {
  const parts = [bytes.subarray(0, 8)];
  const removed = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readU32BE(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("corrupt_image");
    const kind = ascii(bytes, offset + 4, 4);
    if (!removed.has(kind)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (kind === "IEND") break;
  }
  return concat(parts);
}

function sanitizeWebp(bytes) {
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = ascii(bytes, offset, 4);
    const length = readU32LE(bytes, offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) throw new Error("corrupt_image");
    if (kind !== "EXIF" && kind !== "XMP ") chunks.push(bytes.subarray(offset, end));
    offset = end;
  }
  const output = concat([bytes.subarray(0, 12), ...chunks]);
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  return output;
}

export function sanitizePublicDerivative(bytes, mime) {
  if (mime === "image/jpeg") return sanitizeJpeg(bytes);
  if (mime === "image/png") return sanitizePng(bytes);
  if (mime === "image/webp") return sanitizeWebp(bytes);
  if (mime === "image/avif") {
    const raw = new TextDecoder("latin1").decode(bytes);
    if (/Exif|http:\/\/ns\.adobe\.com\/xap|application\/rdf\+xml/i.test(raw)) throw new Error("metadata_not_safely_removable");
    return bytes.slice();
  }
  throw new Error("public_derivative_not_supported");
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function validateMedia(bytes, purpose, declaredMime) {
  const profile = MEDIA_PROFILES[purpose];
  const rejectionCodes = [];
  if (!profile) return { passed: false, rejectionCodes: ["invalid_purpose"] };
  const detectedMime = detectExactMime(bytes);
  if (!detectedMime) rejectionCodes.push("unknown_file_signature");
  if (detectedMime && detectedMime !== declaredMime) rejectionCodes.push("mime_mismatch");
  if (detectedMime && !profile.mimes.includes(detectedMime)) rejectionCodes.push("mime_not_allowed_for_purpose");
  if (bytes.length > profile.maxBytes) rejectionCodes.push("byte_limit_exceeded");
  const metadata = detectedMime ? readTechnicalMetadata(bytes, detectedMime) : null;
  if (!metadata) rejectionCodes.push("decoder_or_dimensions_failed");
  if (metadata && "width" in metadata) {
    const { width, height } = metadata;
    const ratio = width / height;
    if (width < profile.minWidth || height < profile.minHeight) rejectionCodes.push("dimensions_below_minimum");
    if (width > profile.maxWidth || height > profile.maxHeight) rejectionCodes.push("dimensions_above_maximum");
    if (width * height > profile.maxPixels) rejectionCodes.push("pixel_limit_exceeded");
    if (ratio < 0.25 || ratio > 4) rejectionCodes.push("aspect_ratio_out_of_bounds");
  }
  if (metadata && "pageCount" in metadata && metadata.pageCount > profile.maxPages) rejectionCodes.push("page_limit_exceeded");
  const checksum = await sha256Hex(bytes);
  let sanitizedBytes = null;
  if (!rejectionCodes.length && detectedMime !== "application/pdf") {
    try { sanitizedBytes = sanitizePublicDerivative(bytes, detectedMime); }
    catch (error) { rejectionCodes.push(error instanceof Error ? error.message : "metadata_sanitization_failed"); }
  }
  return {
    passed: rejectionCodes.length === 0,
    detectedMime,
    byteSize: bytes.length,
    width: metadata && "width" in metadata ? metadata.width : null,
    height: metadata && "height" in metadata ? metadata.height : null,
    pageCount: metadata && "pageCount" in metadata ? metadata.pageCount : null,
    sha256Hex: checksum,
    sanitizedBytes,
    sanitizedByteSize: sanitizedBytes?.length || null,
    rejectionCodes,
  };
}
