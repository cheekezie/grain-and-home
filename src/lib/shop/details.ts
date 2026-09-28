import type { DetailField, DetailValue, Dimensions } from "./types";

// Product details are defined per shop (Admin → Shop settings → Product
// details) and stored on each product by key. These helpers turn them into
// the spec table, Google attributes and editor values, and validate what
// the editor sends back. Client-safe.

const isDims = (v: unknown): v is Dimensions => !!v && typeof v === "object";

export function formatDetail(field: DetailField, value: DetailValue | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  if (field.kind === "dimensions") {
    if (!isDims(value)) return "";
    return [value.w && `W ${value.w} cm`, value.d && `D ${value.d} cm`, value.h && `H ${value.h} cm`].filter(Boolean).join(" × ");
  }
  if (field.kind === "number") return typeof value === "number" ? `${value}${field.unit ? ` ${field.unit}` : ""}` : "";
  return typeof value === "string" ? value : "";
}

/** [label, text] rows for the product page, in the shop's order, empty ones left out. */
export function detailRows(fields: DetailField[], details: Record<string, DetailValue>): [string, string, DetailField][] {
  return fields.map((f) => [f.label, formatDetail(f, details[f.key]), f] as [string, string, DetailField]).filter(([, v]) => v);
}

const GENDER: Record<string, string> = { men: "male", male: "male", mens: "male", women: "female", female: "female", womens: "female", unisex: "unisex" };
const AGE: Record<string, string> = { adult: "adult", adults: "adult", kids: "kids", children: "kids", toddler: "toddler", infant: "infant", newborn: "newborn" };

export interface GoogleDetails {
  material?: string;
  color?: string;
  size?: string;
  pattern?: string;
  gender?: string;
  ageGroup?: string;
  weightKg?: number;
  dims?: Dimensions;
}

/** Details marked for Google, as the feed and structured data expect them. */
export function googleDetails(fields: DetailField[], details: Record<string, DetailValue>): GoogleDetails {
  const out: GoogleDetails = {};
  for (const f of fields) {
    const v = details[f.key];
    if (!f.google || v === undefined || v === "") continue;
    const text = typeof v === "string" ? v.trim() : "";
    switch (f.google) {
      case "material": if (text) out.material = text; break;
      case "color": if (text) out.color = text; break;
      case "size": if (text) out.size = text; break;
      case "pattern": if (text) out.pattern = text; break;
      case "gender": if (GENDER[text.toLowerCase()]) out.gender = GENDER[text.toLowerCase()]; break;
      case "age_group": if (AGE[text.toLowerCase()]) out.ageGroup = AGE[text.toLowerCase()]; break;
      case "weight": if (typeof v === "number") out.weightKg = f.unit === "g" ? v / 1000 : v; break;
      case "dimensions": if (isDims(v)) out.dims = v; break;
    }
  }
  return out;
}

// ------------------------------------------------------------ editor

/** What the editor holds: strings, and {w,d,h} strings for dimensions. */
export type DetailFormValue = string | { w: string; d: string; h: string };

export function detailsToForm(fields: DetailField[], details: Record<string, DetailValue>): Record<string, DetailFormValue> {
  const out: Record<string, DetailFormValue> = {};
  for (const f of fields) {
    const v = details[f.key];
    if (f.kind === "dimensions") {
      const d = isDims(v) ? v : {};
      out[f.key] = { w: d.w ? String(d.w) : "", d: d.d ? String(d.d) : "", h: d.h ? String(d.h) : "" };
    } else {
      out[f.key] = v === undefined || v === null ? "" : String(v);
    }
  }
  return out;
}

const MAX_TEXT = { text: 300, longtext: 5000 } as const;

function positive(s: string, max: number): number | undefined | "bad" {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > max) return "bad";
  return Math.round(n * 100) / 100;
}

/**
 * Validate the editor's details against the shop's fields. Unknown keys are
 * dropped; required fields are enforced only when publishing.
 */
export function parseDetails(
  fields: DetailField[],
  input: unknown,
  publishing: boolean,
): { details: Record<string, DetailValue>; errors: Record<string, string> } {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const details: Record<string, DetailValue> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const path = `details.${f.key}`;
    const v = raw[f.key];
    if (f.kind === "dimensions") {
      const d = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
      const dims: Dimensions = {};
      for (const k of ["w", "d", "h"] as const) {
        const n = positive(String(d[k] ?? ""), 10000);
        if (n === "bad") errors[path] = `${f.label}: enter centimetres, e.g. 120`;
        else if (n !== undefined) dims[k] = n;
      }
      if (Object.keys(dims).length) details[f.key] = dims;
    } else if (f.kind === "number") {
      const n = positive(String(v ?? ""), 1_000_000);
      if (n === "bad") errors[path] = `${f.label}: enter a number`;
      else if (n !== undefined) details[f.key] = n;
    } else {
      const s = typeof v === "string" ? v.trim() : "";
      if (f.kind === "select") {
        if (s && !(f.options ?? []).includes(s)) errors[path] = `${f.label}: choose from the list`;
        else if (s) details[f.key] = s;
      } else {
        if (s.length > MAX_TEXT[f.kind]) errors[path] = `${f.label} is too long`;
        else if (s) details[f.key] = s;
      }
    }
    if (publishing && f.required && details[f.key] === undefined && !errors[path]) errors[path] = `${f.label} is needed before publishing`;
  }
  return { details, errors };
}
