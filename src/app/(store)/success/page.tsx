import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ClearCartOnLoad from "@/components/ClearCartOnLoad";
import { connectDB } from "@/lib/db";
import OrderModel from "@/models/Order";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

// The order itself is created by the Stripe webhook; this page only reports
// it. If the webhook hasn't landed yet, it says so rather than guessing.
async function OrderNumber({ searchParams }: Pick<PageProps<"/success">, "searchParams">) {
  const { session_id } = await searchParams;
  if (typeof session_id !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(session_id)) return null;
  await connectDB();
  const order = await OrderModel.findOne({ stripeCheckoutId: session_id }).select("number customerEmail").lean();
  if (!order) return <p className="mt-4 text-muted">Your order number will be in the confirmation email.</p>;
  return (
    <p className="mt-4 text-lg">
      Your order number is <span className="tabular font-semibold">#{order.number as number}</span>.
    </p>
  );
}

async function ClearBasket({ searchParams }: Pick<PageProps<"/success">, "searchParams">) {
  // A "Buy now" order never touched the basket, so leave it as it was.
  const { buy_now } = await searchParams;
  return buy_now === "1" ? null : <ClearCartOnLoad />;
}

export default function SuccessPage(props: PageProps<"/success">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <Suspense fallback={null}>
        <ClearBasket searchParams={props.searchParams} />
      </Suspense>
      <h1 className="font-display text-4xl">Thank you, your order is confirmed</h1>
      <Suspense fallback={null}>
        <OrderNumber searchParams={props.searchParams} />
      </Suspense>
      <p className="mt-4 text-muted">
        Stripe will email your payment receipt. We&rsquo;ll contact you by email or phone with delivery details once
        your order is on its way.
      </p>
      <Link href="/" className="mt-8 inline-block font-semibold text-moss underline underline-offset-4">Continue shopping</Link>
    </div>
  );
}
