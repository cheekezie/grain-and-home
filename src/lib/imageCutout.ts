import "server-only";
import sharp from "sharp";

// Is a product photo a cut-out (plain white or transparent background) or a
// photo with its own background (a model or room shot)? Product cards show
// cut-outs whole on the panel colour and let other photos fill the card.
//
// Looks at the photo's edge only: if nearly every edge pixel is transparent
// or near-white, it's a cut-out. undefined = couldn't tell (the photo
// couldn't be fetched), and the card keeps the safe "whole photo" look.

const MAX_BYTES = 15 * 1024 * 1024;

export async function detectCutout(url: string): Promise<boolean | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (shop photo check)" } });
    if (!res.ok) return undefined;
    const size = Number(res.headers.get("content-length") ?? 0);
    if (size > MAX_BYTES) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return undefined;
    const N = 48;
    const { data, info } = await sharp(buf).ensureAlpha().resize(N, N, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let edge = 0;
    let plain = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // The outer 2-pixel ring.
        if (x > 1 && y > 1 && x < N - 2 && y < N - 2) continue;
        const i = (y * N + x) * info.channels;
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        edge++;
        if (a < 25 || (Math.min(r, g, b) >= 232 && Math.max(r, g, b) - Math.min(r, g, b) <= 18)) plain++;
      }
    }
    return plain / edge >= 0.9;
  } catch {
    return undefined;
  }
}

/**
 * Cut-out flags for a product's photos, reusing what's already known for
 * photos that haven't changed (by URL), so a save only checks new photos.
 */
export async function withCutoutFlags<T extends { url: string }>(images: T[], known: Map<string, boolean | undefined>): Promise<(T & { cutout?: boolean })[]> {
  return Promise.all(
    images.map(async (img) => {
      const flag = known.has(img.url) && known.get(img.url) !== undefined ? known.get(img.url) : await detectCutout(img.url);
      return flag === undefined ? { ...img } : { ...img, cutout: flag };
    }),
  );
}
