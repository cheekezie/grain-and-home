// Size a photo URL for a given display width. Unsplash serves any width on
// request; other hosts are used as they are.
export function sizedImage(url: string, w: number): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "images.unsplash.com") return url;
    return `${u.origin}${u.pathname}?auto=format&fit=crop&w=${w}&q=70`;
  } catch {
    return url;
  }
}

/** srcset for resizable hosts; undefined when the host can't resize. */
export function imageSrcSet(url: string, widths: number[]): string | undefined {
  if (sizedImage(url, widths[0]) === url) return undefined;
  return widths.map((w) => `${sizedImage(url, w)} ${w}w`).join(", ");
}

/** 1200×630 share card from the hero photo, where the host can crop. */
export function shareImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const sized = sizedImage(url, 1200);
  return sized === url ? url : `${sized}&h=630`;
}
