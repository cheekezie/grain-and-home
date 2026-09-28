// A shop's look: its colours and font pair (Admin → Shop settings → Look).
// Nothing set = the built-in look (Grain & Home's). Client-safe.

export const FONT_PAIRS = {
  classic: { label: "Classic", description: "Young Serif headings, Figtree text. Warm and traditional." },
  soft: { label: "Soft serif", description: "Fraunces headings, Instrument Sans text. Friendly and editorial." },
  modern: { label: "Modern", description: "Bricolage Grotesque headings, DM Sans text. Bold, suits fashion." },
  clean: { label: "Clean", description: "Manrope for everything. Simple and neutral, suits beauty and tech." },
} as const;
export type FontPair = keyof typeof FONT_PAIRS;
export const FONT_PAIR_KEYS = Object.keys(FONT_PAIRS) as FontPair[];

/** CSS variables each pair points the display and body fonts at (declared in app/layout.tsx). */
export const FONT_VARS: Record<FontPair, { display: string; body: string }> = {
  classic: { display: "var(--font-young-serif)", body: "var(--font-figtree)" },
  soft: { display: "var(--font-fraunces)", body: "var(--font-instrument-sans)" },
  modern: { display: "var(--font-bricolage)", body: "var(--font-dm-sans)" },
  clean: { display: "var(--font-manrope)", body: "var(--font-manrope)" },
};

/** How product cards show their photo. */
export const CARD_STYLES = {
  panel: { label: "Grid: whole product on a panel", description: "Best for cut-out photos on a plain background (furniture, flat-lay clothing)." },
  fill: { label: "Grid: photo fills the card", description: "Best for model and lifestyle photos." },
  masonry: { label: "Masonry", description: "Each photo at its natural shape, in staggered columns." },
} as const;
export type CardStyle = keyof typeof CARD_STYLES;
export const CARD_STYLE_KEYS = Object.keys(CARD_STYLES) as CardStyle[];

export interface ShopTheme {
  /** Buttons, links and highlights. White text sits on it. */
  accent?: string;
  /** Page background. */
  page?: string;
  /** Panels behind product photos and bands. */
  panel?: string;
  /** Main text colour. */
  ink?: string;
  fonts?: FontPair;
  /** Empty = "panel". */
  cards?: CardStyle;
}

export const DEFAULT_THEME: Required<ShopTheme> = { accent: "#3e5c4a", page: "#ffffff", panel: "#f1f0ed", ink: "#1e1c1a", fonts: "classic", cards: "panel" };

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (s: string) => HEX.test(s);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * CSS variables that restyle the shop, for an inline style on <html>. Only
 * what the shop has set; darker/lighter shades are mixed from its colours.
 */
export function themeStyle(t: ShopTheme | undefined): Record<string, string> {
  if (!t) return {};
  const out: Record<string, string> = {};
  if (t.accent) {
    out["--moss"] = t.accent;
    out["--moss-deep"] = `color-mix(in oklab, ${t.accent} 78%, black)`;
    out["--moss-soft"] = `color-mix(in oklab, ${t.accent} 12%, white)`;
  }
  if (t.page) out["--page"] = t.page;
  if (t.panel) out["--plaster"] = t.panel;
  if (t.ink) out["--ink"] = t.ink;
  if (t.ink || t.page) {
    const ink = t.ink ?? "var(--ink)";
    const page = t.page ?? "var(--page)";
    out["--muted"] = `color-mix(in oklab, ${ink} 64%, ${page})`;
    out["--line"] = `color-mix(in oklab, ${ink} 13%, ${page})`;
  }
  if (t.fonts && t.fonts !== "classic") {
    out["--display-font"] = FONT_VARS[t.fonts].display;
    out["--body-font"] = FONT_VARS[t.fonts].body;
  }
  return out;
}
