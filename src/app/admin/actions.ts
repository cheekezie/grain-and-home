"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { flashUrl } from "@/lib/flash";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import {
  clearLoginFailures,
  endSession,
  loginBlocked,
  accessCodeMatches,
  recordLoginFailure,
  requireAdmin,
  startSession,
} from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AVAILABILITY, NEXT_STATUSES, ORDER_STATUSES, RETURN_STATUSES, RETURN_STATUS_LABELS, type OrderStatus, type ReturnStatus } from "@/lib/catalogue";
import { productSchema, promoSchema, supplierSchema, toFormState, type FormState } from "@/lib/admin/schemas";
import ProductModel from "@/models/Product";
import SupplierModel from "@/models/Supplier";
import OrderModel from "@/models/Order";
import ReturnRequestModel from "@/models/ReturnRequest";
import PromoCodeModel from "@/models/PromoCode";
import StockAlertModel from "@/models/StockAlert";

// ------------------------------------------------------------ session

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const blocked = await loginBlocked(ip);
  if (blocked) return { ok: false, message: blocked };
  const code = String(form.get("code") ?? "");
  if (!/^\d{6}$/.test(code.replace(/\s/g, "")) || !accessCodeMatches(code)) {
    await recordLoginFailure(ip);
    return { ok: false, message: "That code isn't right." };
  }
  await clearLoginFailures(ip);
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ------------------------------------------------------------ helpers

function assertId(id: string | null): void {
  if (id !== null && !isValidObjectId(id)) throw new Error("Invalid record id");
}

function readPayload(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return undefined;
  }
}

// Storefront pages are cached for a few minutes; refresh them on any change.
const refreshStore = () => revalidatePath("/", "layout");

// ------------------------------------------------------------ products

export async function saveProduct(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  assertId(id);
  const parsed = productSchema.safeParse(readPayload(form));
  if (!parsed.success) return toFormState(parsed.error);
  const { supplierId, ...data } = parsed.data;
  if (supplierId && !isValidObjectId(supplierId)) return { ok: false, message: "Choose a supplier from the list.", errors: { supplierId: "Choose a supplier" } };

  await connectDB();
  if (await ProductModel.exists({ slug: data.slug, ...(id ? { _id: { $ne: id } } : {}) })) {
    return { ok: false, message: "Another product already uses that web address.", errors: { slug: "Already in use" } };
  }

  // Availability changed in the editor counts as a stock check.
  const before = id ? await ProductModel.findById(id).select("availability").lean() : null;
  const checkedNow = !before || before.availability !== data.availability;

  const set: Record<string, unknown> = { ...data, supplier: supplierId || undefined, ...(checkedNow ? { availabilityCheckedAt: new Date() } : {}) };
  const unset = Object.fromEntries(
    ["supplierCost", "returnCost", "widthCm", "depthCm", "heightCm", "weightKg", "supplierUrl", "supplier"].filter((k) => set[k] === undefined).map((k) => [k, 1]),
  );
  for (const k of Object.keys(unset)) delete set[k];

  let savedId = id;
  if (id) {
    const res = await ProductModel.updateOne({ _id: id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    if (res.matchedCount === 0) return { ok: false, message: "This product no longer exists." };
  } else {
    savedId = String((await ProductModel.create(set))._id);
  }
  refreshStore();
  if (!id) redirect(flashUrl("/admin/products", `Product “${parsed.data.name}” created`, `/admin/products/${savedId}`));
  return { ok: true, message: data.status === "published" ? "Saved and live on the shop." : "Saved as a draft." };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  await connectDB();
  // Orders keep their own snapshot of the item, so history is unaffected.
  await ProductModel.deleteOne({ _id: id });
  refreshStore();
  redirect(flashUrl("/admin/products", "Product deleted"));
}

export async function setProductStatus(id: string, status: "draft" | "published"): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  assertId(id);
  if (status !== "draft" && status !== "published") throw new Error("Invalid status");
  await connectDB();
  if (status === "published") {
    const p = await ProductModel.findById(id).lean();
    if (!p) return { ok: false, message: "Not found." };
    if (p.price == null) return { ok: false, message: "Set a price first." };
    if (p.supplierCost == null) return { ok: false, message: "Enter the supplier cost first." };
    if (!(p.images as unknown[] | undefined)?.length) return { ok: false, message: "Add a photo first." };
    if (!p.supplier) return { ok: false, message: "Choose a supplier first." };
    if (p.returnCost == null) return { ok: false, message: "State the return cost first." };
  }
  await ProductModel.updateOne({ _id: id }, { $set: { status } });
  refreshStore();
  return { ok: true };
}

/** Stock check: record what the supplier says now, and when we checked. */
export async function setAvailability(id: string, availability: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  if (!(AVAILABILITY as readonly string[]).includes(availability)) throw new Error("Invalid availability");
  await connectDB();
  await ProductModel.updateOne({ _id: id }, { $set: { availability, availabilityCheckedAt: new Date() } });
  refreshStore();
  revalidatePath("/admin/stock");
}

// ------------------------------------------------------------ suppliers

export async function saveSupplier(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  assertId(id);
  const parsed = supplierSchema.safeParse(readPayload(form));
  if (!parsed.success) return toFormState(parsed.error);
  await connectDB();
  if (await SupplierModel.exists({ name: parsed.data.name, ...(id ? { _id: { $ne: id } } : {}) })) {
    return { ok: false, message: "A supplier with that name already exists.", errors: { name: "Already in use" } };
  }
  let savedId = id;
  if (id) {
    await SupplierModel.updateOne({ _id: id }, { $set: parsed.data });
  } else {
    savedId = String((await SupplierModel.create(parsed.data))._id);
  }
  revalidatePath("/admin", "layout");
  if (!id) redirect(flashUrl("/admin/suppliers", `Supplier “${parsed.data.name}” added`, `/admin/suppliers/${savedId}`));
  return { ok: true, message: "Saved." };
}

export async function deleteSupplier(id: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  await connectDB();
  if (await ProductModel.exists({ supplier: id })) redirect(`/admin/suppliers/${id}?blocked=1`);
  await SupplierModel.deleteOne({ _id: id });
  redirect(flashUrl("/admin/suppliers", "Supplier deleted"));
}

// ------------------------------------------------------------ orders

const statusSchema = z.enum(ORDER_STATUSES);

/** Move an order along the workflow, with an optional note for the timeline. */
export async function changeOrderStatus(id: string, next: OrderStatus, note: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  assertId(id);
  const status = statusSchema.parse(next);
  await connectDB();
  const order = await OrderModel.findById(id).select("status").lean();
  if (!order) return { ok: false, message: "Order not found." };
  const current = order.status as OrderStatus;
  if (!NEXT_STATUSES[current].includes(status)) return { ok: false, message: `An order can't go from ${current} to ${status}.` };
  await OrderModel.updateOne(
    { _id: id, status: current },
    { $set: { status }, $push: { events: { at: new Date(), status, note: note.trim().slice(0, 1000) } } },
  );
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function addOrderNote(id: string, note: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  const clean = note.trim().slice(0, 1000);
  if (!clean) return;
  await connectDB();
  await OrderModel.updateOne({ _id: id }, { $push: { events: { at: new Date(), note: clean } } });
  revalidatePath(`/admin/orders/${id}`);
}

const refSchema = z.object({
  supplierOrderRef: z.string().trim().max(100),
  trackingUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Tracking link must be a web address" })]),
});

/** Record the supplier's order reference and tracking link for one line. */
export async function saveOrderItemRefs(orderId: string, itemId: string, input: { supplierOrderRef: string; trackingUrl: string }) {
  await requireAdmin();
  assertId(orderId);
  assertId(itemId);
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  await connectDB();
  await OrderModel.updateOne(
    { _id: orderId, "items._id": itemId },
    { $set: { "items.$.supplierOrderRef": parsed.data.supplierOrderRef || undefined, "items.$.trackingUrl": parsed.data.trackingUrl || undefined } },
  );
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Saved." };
}

// ------------------------------------------------------------ returns

export async function changeReturnStatus(id: string, status: ReturnStatus, note: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  if (!(RETURN_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid status");
  const clean = note.trim().slice(0, 1000);
  await connectDB();
  await ReturnRequestModel.updateOne(
    { _id: id },
    { $set: { status }, $push: { events: { at: new Date(), note: `${RETURN_STATUS_LABELS[status]}.${clean ? ` ${clean}` : ""}` } } },
  );
  revalidatePath("/admin/returns", "layout");
}

export async function addReturnNote(id: string, note: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  const clean = note.trim().slice(0, 1000);
  if (!clean) return;
  await connectDB();
  await ReturnRequestModel.updateOne({ _id: id }, { $push: { events: { at: new Date(), note: clean } } });
  revalidatePath(`/admin/returns/${id}`);
}

// ------------------------------------------------------------ promo codes

export async function savePromo(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  assertId(id);
  const parsed = promoSchema.safeParse(readPayload(form));
  if (!parsed.success) return toFormState(parsed.error);
  if (parsed.data.products.some((p) => !isValidObjectId(p))) return { ok: false, message: "A chosen product no longer exists." };
  await connectDB();
  if (await PromoCodeModel.exists({ code: parsed.data.code, ...(id ? { _id: { $ne: id } } : {}) })) {
    return { ok: false, message: "That code already exists.", errors: { code: "Already in use" } };
  }
  let savedId = id;
  if (id) await PromoCodeModel.updateOne({ _id: id }, { $set: parsed.data });
  else savedId = String((await PromoCodeModel.create(parsed.data))._id);
  refreshStore();
  if (!id) redirect(flashUrl("/admin/promos", `Promo code ${parsed.data.code} created`, `/admin/promos/${savedId}`));
  return { ok: true, message: "Saved." };
}

export async function deletePromo(id: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  await connectDB();
  await PromoCodeModel.deleteOne({ _id: id });
  refreshStore();
  redirect(flashUrl("/admin/promos", "Promo code deleted"));
}

export async function setPromoActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  assertId(id);
  await connectDB();
  await PromoCodeModel.updateOne({ _id: id }, { $set: { active } });
  refreshStore();
}

// ------------------------------------------------------------ stock alerts

/** After emailing everyone waiting for a product, mark them notified. */
export async function markStockAlertsNotified(productId: string): Promise<void> {
  await requireAdmin();
  assertId(productId);
  await connectDB();
  await StockAlertModel.updateMany({ product: productId, notifiedAt: null }, { $set: { notifiedAt: new Date() } });
  revalidatePath("/admin/alerts");
}
