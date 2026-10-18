export type ImageExt = "jpg" | "png" | "webp" | "gif";

const startsWith = (b: Buffer, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);

/** Detects the real type from the file's first bytes. Never trust the client's mimetype or filename. */
export function detectImage(b: Buffer): ImageExt | null {
  if (b.length < 12) return null;
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (b.toString("latin1", 0, 6) === "GIF87a" || b.toString("latin1", 0, 6) === "GIF89a") return "gif";
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}