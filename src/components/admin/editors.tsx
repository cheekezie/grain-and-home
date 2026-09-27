"use client";

import { useState } from "react";
import EditorForm, { useFieldError } from "./EditorForm";
import { CheckboxField, ImagesField, MarginNote, MoneyField, Section, SelectField, StatusField, TextField } from "./fields";
import { AVAILABILITY, AVAILABILITY_LABELS, CATEGORIES, DELIVERY_LABELS, DELIVERY_TYPES } from "@/lib/catalogue";
import type { FormState } from "@/lib/admin/schemas";
import type { ProductImage } from "@/lib/types";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

function slugify(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

// ------------------------------------------------------------ product

export interface ProductValue {
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  images: ProductImage[];
  price: string;
  supplierCost: string;
  returnCost: string;
  widthCm: string;
  depthCm: string;
  heightCm: string;
  weightKg: string;
  materials: string;
  colour: string;
  assembly: "none" | "required" | "partial";
  deliveryType: "courier" | "two_person";
  deliveryEstimate: string;
  availability: string;
  supplierId: string;
  supplierSku: string;
  supplierUrl: string;
  internalNotes: string;
  status: "draft" | "published";
  featured: boolean;
  sortOrder: number;
}

export function ProductEditor({
  initial,
  isNew,
  action,
  suppliers,
  justCreated,
  aside,
  checkedAt,
}: {
  initial: ProductValue;
  isNew: boolean;
  action: Action;
  suppliers: { value: string; label: string }[];
  justCreated?: boolean;
  aside?: React.ReactNode;
  checkedAt?: string;
}) {
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const set = <K extends keyof ProductValue>(k: K, val: ProductValue[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <EditorForm action={action} payload={v} justCreated={justCreated} aside={aside}>
      <Section title="Product" hint="Describe it from the supplier's specification. No invented claims, reviews or 'was' prices.">
        <StatusField value={v.status} onChange={(s) => set("status", s)} />
        <TextField
          label="Name"
          path="name"
          value={v.name}
          onChange={(n) => {
            set("name", n);
            if (!slugTouched) set("slug", slugify(n));
          }}
        />
        <TextField
          label="Web address"
          path="slug"
          value={v.slug}
          onChange={(n) => {
            setSlugTouched(true);
            set("slug", n);
          }}
          hint={`/products/${v.slug || "…"}. Changing it on a live product breaks existing links.`}
          mono
        />
        <SelectField label="Room" path="category" value={v.category} onChange={(n) => set("category", n)} options={CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))} />
        <TextField label="Summary" path="summary" value={v.summary} onChange={(n) => set("summary", n)} hint="One or two sentences, shown next to the price." multiline rows={2} />
        <TextField label="Description" path="description" value={v.description} onChange={(n) => set("description", n)} multiline rows={8} />
        <CheckboxField label="Feature on the home page" checked={v.featured} onChange={(n) => set("featured", n)} />
        <TextField label="Position" path="sortOrder" type="number" value={String(v.sortOrder)} onChange={(n) => set("sortOrder", Number(n) || 0)} hint="Lower numbers come first in the room." />
      </Section>

      <Section title="Photos">
        <ImagesField path="images" value={v.images} onChange={(i) => set("images", i)} />
      </Section>

      <Section title="Price and margin" hint="Prices include VAT and mainland UK delivery.">
        <div className="grid gap-5 sm:grid-cols-2">
          <MoneyField label="Price" path="price" value={v.price} onChange={(n) => set("price", n)} />
          <MoneyField label="Supplier cost" path="supplierCost" value={v.supplierCost} onChange={(n) => set("supplierCost", n)} hint="What you pay the supplier, delivered. Never shown on the shop." />
        </div>
        <MarginNote price={v.price} cost={v.supplierCost} />
      </Section>

      <Section title="Specification">
        <div className="grid gap-5 sm:grid-cols-4">
          <TextField label="Width (cm)" path="widthCm" value={v.widthCm} onChange={(n) => set("widthCm", n)} />
          <TextField label="Depth (cm)" path="depthCm" value={v.depthCm} onChange={(n) => set("depthCm", n)} />
          <TextField label="Height (cm)" path="heightCm" value={v.heightCm} onChange={(n) => set("heightCm", n)} />
          <TextField label="Weight (kg)" path="weightKg" value={v.weightKg} onChange={(n) => set("weightKg", n)} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Materials" path="materials" value={v.materials} onChange={(n) => set("materials", n)} />
          <TextField label="Colour" path="colour" value={v.colour} onChange={(n) => set("colour", n)} />
        </div>
        <SelectField
          label="Assembly"
          path="assembly"
          value={v.assembly}
          onChange={(n) => set("assembly", n as ProductValue["assembly"])}
          options={[{ value: "required", label: "Self-assembly required" }, { value: "partial", label: "Some assembly required" }, { value: "none", label: "Arrives assembled" }]}
        />
      </Section>

      <Section title="Delivery and returns" hint="The return cost is shown on the product page. UK law requires it up front for items that can't be posted.">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Delivery" path="deliveryType" value={v.deliveryType} onChange={(n) => set("deliveryType", n as ProductValue["deliveryType"])} options={DELIVERY_TYPES.map((d) => ({ value: d, label: DELIVERY_LABELS[d] }))} />
          <TextField label="Delivery time" path="deliveryEstimate" value={v.deliveryEstimate} onChange={(n) => set("deliveryEstimate", n)} hint="As the supplier quotes it, e.g. Delivered in 3–5 working days" />
        </div>
        <MoneyField label="Return cost if the customer changes their mind" path="returnCost" value={v.returnCost} onChange={(n) => set("returnCost", n)} hint="Usually the supplier's collection charge. Enter 0 if returns are free. Required to publish." />
      </Section>

      <Section title="Supplier and availability" hint="Internal only. Customers never see who supplies a product.">
        <SelectField
          label="Supplier"
          path="supplierId"
          value={v.supplierId}
          onChange={(n) => set("supplierId", n)}
          options={[{ value: "", label: suppliers.length ? "Choose…" : "Add a supplier first" }, ...suppliers]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Supplier product code" path="supplierSku" value={v.supplierSku} onChange={(n) => set("supplierSku", n)} mono />
          <TextField label="Supplier product page" path="supplierUrl" value={v.supplierUrl} onChange={(n) => set("supplierUrl", n)} type="url" mono hint="Where you order it. Shown on orders for quick ordering." />
        </div>
        <SelectField
          label="Availability"
          path="availability"
          value={v.availability}
          onChange={(n) => set("availability", n)}
          options={AVAILABILITY.map((a) => ({ value: a, label: AVAILABILITY_LABELS[a] }))}
          hint={checkedAt ? `Last checked ${new Date(checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. Changing it records a new check.` : "Changing it records a stock check."}
        />
        <TextField
          label="Internal notes"
          path="internalNotes"
          value={v.internalNotes}
          onChange={(n) => set("internalNotes", n)}
          multiline
          rows={4}
          hint="Never shown on the shop. What still needs confirming with the supplier."
        />
      </Section>
    </EditorForm>
  );
}

// ------------------------------------------------------------ supplier

export interface SupplierValue {
  name: string;
  website: string;
  orderUrl: string;
  contactEmail: string;
  contactPhone: string;
  accountRef: string;
  notes: string;
  returnInstructions: string;
  whiteLabel: boolean;
  senderDomains: string;
  autoCustomerUpdates: boolean;
  active: boolean;
}

export function SupplierEditor({
  initial,
  action,
  justCreated,
  aside,
  orderingInbox,
}: {
  initial: SupplierValue;
  action: Action;
  justCreated?: boolean;
  aside?: React.ReactNode;
  /** The ordering inbox (Supplier emails page), shown for reference. */
  orderingInbox: string | null;
}) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof SupplierValue>(k: K, val: SupplierValue[K]) => setV((p) => ({ ...p, [k]: val }));
  return (
    <EditorForm action={action} payload={v} justCreated={justCreated} aside={aside}>
      <Section title="Supplier">
        <TextField label="Name" path="name" value={v.name} onChange={(n) => set("name", n)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Website" path="website" value={v.website} onChange={(n) => set("website", n)} type="url" mono />
          <TextField label="Where you place orders" path="orderUrl" value={v.orderUrl} onChange={(n) => set("orderUrl", n)} type="url" mono hint="Trade portal or account page." />
          <TextField label="Contact email" path="contactEmail" value={v.contactEmail} onChange={(n) => set("contactEmail", n)} />
          <TextField label="Contact phone" path="contactPhone" value={v.contactPhone} onChange={(n) => set("contactPhone", n)} />
          <TextField label="Your account number" path="accountRef" value={v.accountRef} onChange={(n) => set("accountRef", n)} mono />
        </div>
        <TextField
          label="Notes"
          path="notes"
          value={v.notes}
          onChange={(n) => set("notes", n)}
          multiline
          rows={6}
          hint="Delivery areas and surcharges, lead times, how to raise a return or damage claim, minimum order."
        />
        <TextField
          label="Return instructions for customers"
          path="returnInstructions"
          value={v.returnInstructions}
          onChange={(n) => set("returnInstructions", n)}
          multiline
          rows={6}
          hint="What a customer should do to send this supplier's items back: packing, collection or drop-off, the returns address. Shown on return requests for items from this supplier, ready to copy into your reply."
        />
      </Section>

      <Section title="Delivery emails" hint="Who tells the customer their order is on its way.">
        <CheckboxField
          label="White label"
          checked={v.whiteLabel}
          onChange={(n) => set("whiteLabel", n)}
          hint="They deliver unbranded and never contact the customer (e.g. Artisan). You add tracking on the order and we email the customer."
        />
        {!v.whiteLabel && (
          <>
            <p className="rounded-lg bg-plaster px-3 py-2 text-[14px]">
              {orderingInbox ? (
                <>Order with <strong>{orderingInbox}</strong> as the contact email, so their emails come to you (never the customer). This is your ordering inbox, set once for all suppliers in Supplier emails.</>
              ) : (
                <>Set your ordering inbox in Supplier emails: the one address you give suppliers when ordering, which the shop reads.</>
              )}
            </p>
            <TextField
              label="Their email domains"
              path="senderDomains"
              value={v.senderDomains}
              onChange={(n) => set("senderDomains", n)}
              mono
              hint="Where their order emails come from, e.g. wayfair.co.uk, wayfair.com. Only emails from these domains are read from your inbox."
            />
            <CheckboxField
              label="Email customers automatically"
              checked={v.autoCustomerUpdates}
              onChange={(n) => set("autoCustomerUpdates", n)}
              hint="When their email matches an order and says dispatched (with a carrier tracking link), out for delivery or delivered, email the customer straight away. Off: each one waits in Supplier emails for you to check."
            />
          </>
        )}
        <CheckboxField label="Active" checked={v.active} onChange={(n) => set("active", n)} />
      </Section>
    </EditorForm>
  );
}

// ------------------------------------------------------------ promo code

export interface PromoValue {
  code: string;
  headline: string;
  kind: "percent" | "fixed";
  value: string;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categories: string[];
  minSpend: string;
  startsOn: string;
  expiresOn: string;
  maxUses: string;
  oncePerCustomer: boolean;
  active: boolean;
  announce: boolean;
  welcome: boolean;
}

export function PromoEditor({
  initial,
  action,
  products,
  justCreated,
  aside,
}: {
  initial: PromoValue;
  action: Action;
  products: { id: string; name: string; category: string; live: boolean }[];
  justCreated?: boolean;
  aside?: React.ReactNode;
}) {
  const [v, setV] = useState(initial);
  const [filter, setFilter] = useState("");
  const set = <K extends keyof PromoValue>(k: K, val: PromoValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const toggle = (k: "productIds" | "categories", id: string) =>
    setV((p) => ({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] }));
  const shown = products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <EditorForm action={action} payload={v} justCreated={justCreated} aside={aside}>
      <Section title="Code" hint="Customers type the code at checkout. The discount is worked out again on the server every time.">
        <CheckboxField label="Active" checked={v.active} onChange={(n) => set("active", n)} hint="Switch off to stop the code working straight away." />
        <TextField label="Code" path="code" value={v.code} onChange={(n) => set("code", n.toUpperCase().replace(/\s/g, ""))} mono hint="e.g. WELCOME10. Letters, numbers and hyphens." />
        <TextField label="Headline" path="headline" value={v.headline} onChange={(n) => set("headline", n)} hint="What customers see, e.g. 10% off your first order. Keep it true: no invented 'was' prices." />
      </Section>

      <Section title="Discount">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Type"
            path="kind"
            value={v.kind}
            onChange={(n) => set("kind", n as PromoValue["kind"])}
            options={[{ value: "percent", label: "Percentage off" }, { value: "fixed", label: "Amount off (£)" }]}
          />
          {v.kind === "percent" ? (
            <TextField label="Percentage" path="value" value={v.value} onChange={(n) => set("value", n)} type="number" hint="1 to 90" />
          ) : (
            <MoneyField label="Amount off" path="value" value={v.value} onChange={(n) => set("value", n)} />
          )}
        </div>
        <MoneyField label="Minimum spend (optional)" path="minSpend" value={v.minSpend} onChange={(n) => set("minSpend", n)} hint="Order subtotal needed before the code works." />
      </Section>

      <Section title="Applies to">
        <SelectField
          label="Products"
          path="scope"
          value={v.scope}
          onChange={(n) => set("scope", n as PromoValue["scope"])}
          options={[{ value: "all", label: "Everything" }, { value: "categories", label: "Chosen rooms" }, { value: "products", label: "Chosen products" }]}
        />
        {v.scope === "categories" && (
          <fieldset>
            <legend className="font-semibold">Rooms</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <label key={c.slug} className="flex items-center gap-2">
                  <input type="checkbox" checked={v.categories.includes(c.slug)} onChange={() => toggle("categories", c.slug)} className="size-5 accent-accent" />
                  {c.name}
                </label>
              ))}
            </div>
            <PathError path="categories" />
          </fieldset>
        )}
        {v.scope === "products" && (
          <fieldset>
            <legend className="font-semibold">Products ({v.productIds.length} chosen)</legend>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name" className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2" />
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
              {shown.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-[15px]">
                  <input type="checkbox" checked={v.productIds.includes(p.id)} onChange={() => toggle("productIds", p.id)} className="size-5 shrink-0 accent-accent" />
                  <span>{p.name}{!p.live && <span className="text-muted"> (draft)</span>}</span>
                </label>
              ))}
              {shown.length === 0 && <p className="text-muted">No products match.</p>}
            </div>
            <PathError path="productIds" />
          </fieldset>
        )}
      </Section>

      <Section title="Dates and limits" hint="Dates are UK time. The code stops working at the end of the expiry day.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Starts (optional)" path="startsOn" value={v.startsOn} onChange={(n) => set("startsOn", n)} type="date" />
          <TextField label="Expires (optional)" path="expiresOn" value={v.expiresOn} onChange={(n) => set("expiresOn", n)} type="date" />
        </div>
        <TextField label="Total uses allowed (optional)" path="maxUses" value={v.maxUses} onChange={(n) => set("maxUses", n)} type="number" hint="Counted when a paid order uses the code." />
        <CheckboxField label="One use per customer" checked={v.oncePerCustomer} onChange={(n) => set("oncePerCustomer", n)} hint="Checked against the email at checkout." />
      </Section>

      <Section title="Promotion on the shop">
        <CheckboxField
          label="Announce on the shop"
          checked={v.announce}
          onChange={(n) => set("announce", n)}
          hint="Shows an offer bar on every page and a one-time 'claim your offer' pop-up. Only while the code is active and in date."
        />
        <CheckboxField
          label="Welcome code for new subscribers"
          checked={v.welcome}
          onChange={(n) => set("welcome", n)}
          hint="Shown to people when they sign up for emails. Tip: also tick 'One use per customer'."
        />
      </Section>
    </EditorForm>
  );
}

function PathError({ path }: { path: string }) {
  const error = useFieldError(path);
  return error ? <p className="mt-1 text-[14px] font-semibold text-danger">{error}</p> : null;
}

// ------------------------------------------------------------ room page

export interface RoomValue {
  intro: string;
  metaDescription: string;
  guide: string;
}

export function RoomEditor({ initial, action, roomName, defaultBlurb }: { initial: RoomValue; action: Action; roomName: string; defaultBlurb: string }) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof RoomValue>(k: K, val: RoomValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const words = v.guide.trim() ? v.guide.trim().split(/\s+/).length : 0;
  return (
    <EditorForm action={action} payload={v}>
      <Section title="Top of the page">
        <TextField
          label="Intro"
          path="intro"
          value={v.intro}
          onChange={(n) => set("intro", n)}
          multiline
          rows={2}
          hint={`One or two sentences under “${roomName}”. Empty uses: “${defaultBlurb}”`}
        />
      </Section>
      <Section title="In Google" hint="What Google shows under the page title in search results.">
        <TextField
          label="Search description"
          path="metaDescription"
          value={v.metaDescription}
          onChange={(n) => set("metaDescription", n)}
          multiline
          rows={2}
          hint={`${v.metaDescription.length}/160 characters. Say what's here and why to click, e.g. “Solid mango wood bedside tables and chests, delivered free across mainland UK.”`}
        />
      </Section>
      <Section
        title="Buying guide"
        hint="Shown below the products. Helpful, specific advice ranks: sizes, materials, what to measure. Write it yourself or from real product facts, never invented claims."
      >
        <TextField
          label="Guide"
          path="guide"
          value={v.guide}
          onChange={(n) => set("guide", n)}
          multiline
          rows={18}
          hint={`${words} words. Blank line = new paragraph. Start a line with “## ” for a heading, “- ” for a bullet point. 300–800 words is a good length.`}
        />
      </Section>
    </EditorForm>
  );
}
