import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { findUsablePromo } from "@/lib/promos";
import { applyPromo } from "@/lib/promoPricing";
import { formatPrice } from "@/lib/money";
import ProductModel from "@/models/Product";

// Preview a promo code at checkout. The checkout itself recalculates, so
// this only tells the customer what they'll get.
const bodySchema = z.object({
  code: z.string().max(40),
  email: z.string().max(200).optional(),
  items: z.array(z.object({ productId: z.string().refine(isValidObjectId), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Couldn't check that code. Try again." }, { status: 400 });
  const found = await findUsablePromo(parsed.data.code, parsed.data.email);
  if (!found.ok) return NextResponse.json(found);

  await connectDB();
  const products = await ProductModel.find({ _id: { $in: parsed.data.items.map((i) => i.productId) }, status: "published" }).select("price category").lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = parsed.data.items
    .filter((i) => byId.has(i.productId))
    .map((i) => ({ productId: i.productId, category: byId.get(i.productId)!.category as string, price: byId.get(i.productId)!.price as number, quantity: i.quantity }));
  const outcome = applyPromo(found.rule, lines, formatPrice);
  if (!outcome.ok) return NextResponse.json(outcome);
  return NextResponse.json({ ok: true, code: found.rule.code, headline: found.rule.headline, discount: outcome.discount });
}
