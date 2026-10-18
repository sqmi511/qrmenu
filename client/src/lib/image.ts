const MAX_SIDE = 1600;

/** Shrinks big photos and re-encodes them as WebP. Falls back to the original file on any problem. */
export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file; // would lose the animation
  try {
    const bmp = await createImageBitmap(file); // applies EXIF rotation
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= 800_000) {
      bmp.close();
      return file;
    }
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob && blob.type === "image/webp" && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}