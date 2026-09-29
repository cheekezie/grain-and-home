import { z } from "zod";
import { AVAILABILITY, DELIVERY_TYPES } from "@/lib/catalogue";
import { CURRENCY_SYMBOL, escapeSymbol, parsePounds } from "@/lib/money";
import { MAX_OPTIONS, MAX_VARIANTS, OPTION_GOOGLE, syncVariants } from "@/lib/variants";
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

export const productSchema = z
  .object({
    slug,
    name: text("Name", 150),
    // Checked against the shop's categories in the save action.
    category: z.string().trim().min(1, "Choose a category"),
    summary: text("Summary", 300),
    description: text("Description", 8000),
    images: z
      .array(
        z.object({
          url: z.url({ protocol: /^https$/, error: "Photo links must start with https://" }),
          alt: z.string().trim().max(200).default(""),
          forValue: z.string().trim().max(40).optional().transform((s) => s || undefined),
        }),
      )
      .max(12),
    price: pounds("Price", false),
    supplierCost: pounds("Supplier cost", false),
    returnCost: pounds("Return cost", false),
    // The shop's own details: validated against its fields in the save action.
    details: z.record(z.string(), z.unknown()).default({}),
    /** A pack: product ids of its pieces, in order (repeats allowed). */
    packSlots: z.array(z.string().regex(/^[a-f0-9]{24}$/, "Choose a product")).max(12, "Up to 12 pieces in a pack").default([]),
    /** Per piece: options we fix, e.g. { Colour: "Black" }; "" / missing = customer chooses. */
    packPresets: z
      .array(z.record(z.string().max(30), z.string().max(40)))
      .max(12)
      .default([])
      .transform((list) => list.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v)))),
    options: z
      .array(
        z.object({
          name: text("Option name", 30),
          valuesText: z
            .string()
            .transform((s) => [...new Set(s.split(",").map((v) => v.trim()).filter(Boolean))])
            .pipe(z.array(z.string().max(40, "Keep each choice under 40 characters")).min(1, "Add at least one choice").max(30, "Up to 30 choices")),
          google: z.enum(OPTION_GOOGLE),
        }),
      )
      .max(MAX_OPTIONS),
    variants: z
      .array(
        z.object({
          id: z.string(),
          values: z.array(z.string()),
          price: pounds("Price", false),
          supplierCost: pounds("Supplier cost", false),
          supplierSku: optionalText(100),
          availability: z.enum(AVAILABILITY),
        }),
      )
      .max(MAX_VARIANTS * 2),
    deliveryType: z.enum(DELIVERY_TYPES),
    deliveryEstimate: optionalText(120),
    availability: z.enum(AVAILABILITY),
    supplierId: z.string().trim().default(""),
    supplierSku: optionalText(100),
    supplierUrl: optionalUrl,
    /** Set only when created from Import from Printful: the catalogue id, and the search to go back to. */
    importFrom: z.object({ printfulId: z.number().int().positive(), q: z.string().max(80) }).optional(),
    internalNotes: optionalText(5000),
    status: z.enum(["draft", "published"]),
    featured: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .superRefine((p, ctx) => {
    if (p.packSlots.length && p.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "A pack has no options of its own: customers choose options for each piece" });
    if (p.packSlots.length === 1) ctx.addIssue({ code: "custom", path: ["packSlots"], message: "A pack needs at least two pieces" });
    const names = p.options.map((o) => o.name.toLowerCase());
    names.forEach((n, i) => {
      if (names.indexOf(n) !== i) ctx.addIssue({ code: "custom", path: ["options", i, "name"], message: "Two options have the same name" });
    });
    const combos = p.options.reduce((n, o) => n * o.valuesText.length, 1);
    if (p.options.length && combos > MAX_VARIANTS) ctx.addIssue({ code: "custom", path: ["options"], message: `That makes ${combos} combinations; the most is ${MAX_VARIANTS}` });
    p.variants.forEach((v, i) => {
      if (v.price !== undefined && v.supplierCost !== undefined && v.supplierCost >= v.price) {
        ctx.addIssue({ code: "custom", path: ["variants", i], message: "Price is at or below its supplier cost" });
      }
    });
    if (p.status !== "published") return;
    const pack = p.packSlots.length > 0;
    // What a live product must have: something to show, someone to buy it
    // from, and the return cost the law says must be stated up front.
    if (p.price === undefined) ctx.addIssue({ code: "custom", path: ["price"], message: "Set a price before publishing" });
    // A pack's cost and suppliers come from its pieces (worked out when saved).
    if (p.supplierCost === undefined && !pack) ctx.addIssue({ code: "custom", path: ["supplierCost"], message: "Enter your supplier cost before publishing, so the margin is known" });
    if (p.images.length === 0) ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
    if (!p.supplierId && !pack) ctx.addIssue({ code: "custom", path: ["supplierId"], message: "Choose the supplier before publishing" });
    if (p.returnCost === undefined) {
      ctx.addIssue({ code: "custom", path: ["returnCost"], message: "State the cost of returning this item before publishing (0 if free)" });
    }
    if (p.supplierCost !== undefined && p.price !== undefined && p.supplierCost >= p.price) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "The price is at or below the supplier cost" });
    }
    if (p.options.length && !p.variants.some((v) => v.availability === "in_stock" || v.availability === "low_stock")) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Mark at least one combination in stock before publishing" });
    }
    // A variant's own cost must still leave a margin at the product's price.
    p.variants.forEach((v, i) => {
      if (v.price === undefined && v.supplierCost !== undefined && p.price !== undefined && v.supplierCost >= p.price) {
        ctx.addIssue({ code: "custom", path: ["variants", i], message: "Its supplier cost is at or above the product's price: give it its own price" });
      }
    });
  })
  // The variants saved are exactly the options' combinations (keeping what
  // was set for each); anything stale from an earlier set of options drops.
  .transform((p) => {
    const options = p.options.map((o) => ({ name: o.name, values: o.valuesText, ...(o.google && { google: o.google }) }));
    const variants = syncVariants(options, p.variants, (values, id) => ({ id, values, price: undefined, supplierCost: undefined, supplierSku: "", availability: "in_stock" as const })).map((v) => ({
      id: v.id,
      values: v.values,
      ...(v.price !== undefined && { price: v.price }),
      ...(v.supplierCost !== undefined && { supplierCost: v.supplierCost }),
      ...(v.supplierSku && { supplierSku: v.supplierSku }),
      availability: v.availability,
    }));
    return { ...p, options, variants };
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
  whiteLabel: z.boolean(),
  senderDomains: z
    .string()
    .transform((s) => s.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Domains like wayfair.co.uk, separated by commas")).max(10)),
  autoCustomerUpdates: z.boolean(),
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
    categories: z.array(z.string()).max(50),
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
    if (p.scope === "categories" && p.categories.length === 0) ctx.addIssue({ code: "custom", path: ["categories"], message: "Choose at least one category" });
    // The headline is what customers read: its % or £ figure must match the
    // real discount (e.g. "10% off" on a 5% code misleads).
    const pct = p.headline.match(/(\d+(?:\.\d+)?)\s*%/);
    const gbp = p.headline.match(new RegExp(`${escapeSymbol(CURRENCY_SYMBOL)}\\s*(\\d+(?:\\.\\d{1,2})?)`));
    if (pct && !(p.kind === "percent" && Number(pct[1]) === value)) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: `Headline says ${pct[1]}% but the discount is ${p.kind === "percent" ? `${p.value}%` : `${CURRENCY_SYMBOL}${p.value} off`}` });
    }
    if (gbp && p.kind === "fixed" && parsePounds(gbp[1]) !== value) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: `Headline says ${CURRENCY_SYMBOL}${gbp[1]} but the discount is ${CURRENCY_SYMBOL}${p.value}` });
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
