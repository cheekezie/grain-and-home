import { z } from "zod";
import { AVAILABILITY, CATEGORY_SLUGS, DELIVERY_TYPES } from "@/lib/catalogue";
import { parsePounds } from "@/lib/money";
import { londonDateTime } from "@/lib/londonDate";

// Validation for everything the admin writes. Editors post the whole record
// as JSON; these schemas are the only gate between that and the database.

const text = (label: string, max = 20000) => z.string().trim().min(1, `${label} can't be empty`).max(max, `${label} is too long`);
const optionalText = (max = 20000) => z.string().trim().max(max).default("");
const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || undefined)
  .pipe(z.url({ protocol: /^https$/, error: "Use a full https:// address" }).optional());
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens, e.g. oak-desk-120");

/** "£249.99" → 24999 pence. Empty → undefined when optional. */
const pounds = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (!s) {
        if (required) ctx.addIssue({ code: "custom", message: `${label} is required` });
        return undefined;
      }
      const p = parsePounds(s);
      if (Number.isNaN(p)) {
        ctx.addIssue({ code: "custom", message: `${label}: enter an amount like 249.99` });
        return undefined;
      }
      return p;
    });

const optionalNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (!s) return undefined;
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0 || n > max) {
        ctx.addIssue({ code: "custom", message: `${label}: enter a number up to ${max}` });
        return undefined;
      }
      return Math.round(n * 10) / 10;
    });

export const productSchema = z
  .object({
    slug,
    name: text("Name", 150),
    category: z.enum(CATEGORY_SLUGS as [string, ...string[]], { error: "Choose a room" }),
    summary: text("Summary", 300),
    description: text("Description", 8000),
    images: z
      .array(z.object({ url: z.url({ protocol: /^https$/, error: "Photo links must start with https://" }), alt: z.string().trim().max(200).default("") }))
      .max(12),
    price: pounds("Price", false),
    supplierCost: pounds("Supplier cost", false),
    returnCost: pounds("Return cost", false),
    widthCm: optionalNumber("Width", 1000),
    depthCm: optionalNumber("Depth", 1000),
    heightCm: optionalNumber("Height", 1000),
    weightKg: optionalNumber("Weight", 1000),
    materials: optionalText(300),
    colour: optionalText(100),
    assembly: z.enum(["none", "required", "partial"]),
    deliveryType: z.enum(DELIVERY_TYPES),
    deliveryEstimate: optionalText(120),
    availability: z.enum(AVAILABILITY),
    supplierId: z.string().trim().default(""),
    supplierSku: optionalText(100),
    supplierUrl: optionalUrl,
    internalNotes: optionalText(5000),
    status: z.enum(["draft", "published"]),
    featured: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .superRefine((p, ctx) => {
    if (p.status !== "published") return;
    // What a live product must have: something to show, someone to buy it
    // from, and the return cost the law says must be stated up front.
    if (p.price === undefined) ctx.addIssue({ code: "custom", path: ["price"], message: "Set a price before publishing" });
    if (p.supplierCost === undefined) ctx.addIssue({ code: "custom", path: ["supplierCost"], message: "Enter your supplier cost before publishing, so the margin is known" });
    if (p.images.length === 0) ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
    if (!p.supplierId) ctx.addIssue({ code: "custom", path: ["supplierId"], message: "Choose the supplier before publishing" });
    if (p.returnCost === undefined) {
      ctx.addIssue({ code: "custom", path: ["returnCost"], message: "State the cost of returning this item before publishing (0 if free)" });
    }
    if (p.supplierCost !== undefined && p.price !== undefined && p.supplierCost >= p.price) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "The price is at or below the supplier cost" });
    }
  });

export const supplierSchema = z.object({
  name: text("Name", 120),
  website: optionalUrl,
  orderUrl: optionalUrl,
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]).transform((s) => s || undefined),
  contactPhone: optionalText(40),
  accountRef: optionalText(80),
  notes: optionalText(5000),
  returnInstructions: optionalText(5000),
  active: z.boolean(),
});

const day = (time: "start" | "end") =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (!s) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        ctx.addIssue({ code: "custom", message: "Pick a date" });
        return undefined;
      }
      return londonDateTime(s, time);
    });

export const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,30}$/, "3 to 30 letters, numbers or hyphens, e.g. WELCOME10"),
    headline: text("Headline", 120),
    kind: z.enum(["percent", "fixed"]),
    value: z.string().trim(),
    scope: z.enum(["all", "products", "categories"]),
    productIds: z.array(z.string()).max(200),
    categories: z.array(z.enum(CATEGORY_SLUGS as [string, ...string[]])).max(20),
    minSpend: pounds("Minimum spend", false),
    startsOn: day("start"),
    expiresOn: day("end"),
    maxUses: z
      .string()
      .trim()
      .transform((s, ctx) => {
        if (!s) return undefined;
        const n = Number(s);
        if (!Number.isInteger(n) || n < 1) ctx.addIssue({ code: "custom", message: "A whole number, 1 or more" });
        return n;
      }),
    oncePerCustomer: z.boolean(),
    active: z.boolean(),
    announce: z.boolean(),
    welcome: z.boolean(),
  })
  .transform((p, ctx) => {
    let value = NaN;
    if (p.kind === "percent") {
      value = Number(p.value);
      if (!Number.isInteger(value) || value < 1 || value > 90) ctx.addIssue({ code: "custom", path: ["value"], message: "A whole percentage from 1 to 90" });
    } else {
      value = parsePounds(p.value);
      if (Number.isNaN(value) || value < 1) ctx.addIssue({ code: "custom", path: ["value"], message: "An amount like 25 or 25.00" });
    }
    if (p.scope === "products" && p.productIds.length === 0) ctx.addIssue({ code: "custom", path: ["productIds"], message: "Choose at least one product" });
    if (p.scope === "categories" && p.categories.length === 0) ctx.addIssue({ code: "custom", path: ["categories"], message: "Choose at least one room" });
    // The headline is what customers read: its % or £ figure must match the
    // real discount (e.g. "10% off" on a 5% code misleads).
    const pct = p.headline.match(/(\d+(?:\.\d+)?)\s*%/);
    const gbp = p.headline.match(/£\s*(\d+(?:\.\d{1,2})?)/);
    if (pct && !(p.kind === "percent" && Number(pct[1]) === value)) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: `Headline says ${pct[1]}% but the discount is ${p.kind === "percent" ? `${p.value}%` : `£${p.value} off`}` });
    }
    if (gbp && p.kind === "fixed" && Math.round(Number(gbp[1]) * 100) !== value) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: `Headline says £${gbp[1]} but the discount is £${p.value}` });
    }
    if (p.startsOn && p.expiresOn && p.expiresOn <= p.startsOn) ctx.addIssue({ code: "custom", path: ["expiresOn"], message: "Must be after the start date" });
    return {
      code: p.code,
      headline: p.headline,
      kind: p.kind,
      value,
      scope: p.scope,
      products: p.scope === "products" ? p.productIds : [],
      categories: p.scope === "categories" ? p.categories : [],
      minSpend: p.minSpend ?? null,
      startsAt: p.startsOn ?? null,
      expiresAt: p.expiresOn ?? null,
      maxUses: p.maxUses ?? null,
      oncePerCustomer: p.oncePerCustomer,
      active: p.active,
      announce: p.announce,
      welcome: p.welcome,
    };
  });

export type FormState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

export function toFormState(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  const n = Object.keys(errors).length;
  return { ok: false, message: `Fix ${n === 1 ? "1 problem" : `${n} problems`} before saving.`, errors };
}
