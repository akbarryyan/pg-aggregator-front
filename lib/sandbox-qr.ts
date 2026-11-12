import jsQR from "jsqr";

/** Reference from a WhuzPay sandbox QR payload, or null. */
export function parseSandboxPayload(text: string): string | null {
  if (!text.startsWith("sandbox:")) return null;
  for (const part of text.slice("sandbox:".length).split(";")) {
    const [k, v] = part.split("=");
    if (k === "order" && v) return v;
  }
  return null;
}

const MAX_DECODE_SIDE = 1600;

/** Decodes the first QR code in an image blob; null when none is found. */
export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    return jsQR(data.data, data.width, data.height)?.data ?? null;
  } finally {
    bitmap.close();
  }
}
