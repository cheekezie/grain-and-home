/** Redirect target that shows a toast in the admin (see AdminFlash). */
export function flashUrl(path: string, message: string, href?: string) {
  const q = new URLSearchParams({ flash: message });
  if (href) q.set("flashHref", href);
  return `${path}${path.includes("?") ? "&" : "?"}${q}`;
}
