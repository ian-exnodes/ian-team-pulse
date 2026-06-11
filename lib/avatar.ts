export const AVATAR_SIZE = 256;
export const MAX_GIF_BYTES = 3 * 1024 * 1024;

export type PreparedAvatar = { blob: Blob; contentType: "image/jpeg" | "image/gif" };

export function avatarPublicUrl(
  baseUrl: string,
  userId: string,
  version: number
): string {
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${encodeURIComponent(userId)}?v=${version}`;
}

// JPEG/PNG/WebP are center-cropped + downscaled to a small square JPEG.
// GIFs pass through untouched - a canvas pass would freeze the animation
// to its first frame - bounded by a size cap instead.
export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) {
      throw new Error("GIF is too large — keep it under 3 MB");
    }
    return { blob: file, contentType: "image/gif" };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Unsupported image type — use JPG, PNG, WebP, or GIF");
  }
  return { blob: await resizeToSquareJpeg(file), contentType: "image/jpeg" };
}

async function resizeToSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // rejects on broken images
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))),
        "image/jpeg",
        0.85
      )
    );
  } finally {
    bitmap.close();
  }
}
