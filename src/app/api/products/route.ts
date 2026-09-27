import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { toStoreProduct } from "@/lib/serialize";
import ProductModel from "@/models/Product";

// Current details for products saved or viewed in the browser, so the
// saved page never shows an old price. Published products only.
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(isValidObjectId).slice(0, 60);
  if (ids.length === 0) return NextResponse.json([]);
  await connectDB();
  const docs = await ProductModel.find({ _id: { $in: ids }, status: "published", availability: { $ne: "discontinued" } }).lean();
  return NextResponse.json(docs.map(toStoreProduct));
}
