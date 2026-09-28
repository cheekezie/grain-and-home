import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { marketingCounts, orderCounts, returnCounts, supplierEmailCounts } from "@/lib/admin/queries";
import { siteConfig } from "@/lib/siteConfig";
import { logout } from "../actions";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFlash from "@/components/admin/AdminFlash";
import Toaster from "@/components/store/Toaster";
import { Suspense } from "react";

export const metadata: Metadata = { title: { default: "Admin", template: `%s | ${siteConfig.name} admin` }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [counts, returns, marketing, mail] = await Promise.all([orderCounts(), returnCounts(), marketingCounts(), supplierEmailCounts()]);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_1fr]">
      <AdminSidebar
        brand={<Link href="/admin" className="font-display text-2xl">{siteConfig.name}</Link>}
        subtitle="Store admin"
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/insights", label: "Insights" },
          { href: "/admin/orders", label: "Orders", badge: counts.paid ?? 0 },
          { href: "/admin/returns", label: "Returns", badge: returns.new ?? 0 },
          { href: "/admin/supplier-emails", label: "Supplier emails", badge: (mail.new ?? 0) + (mail.unmatched ?? 0) },
          { href: "/admin/products", label: "Products" },
          { href: "/admin/categories", label: "Categories" },
          { href: "/admin/stock", label: "Stock check" },
          { href: "/admin/suppliers", label: "Suppliers" },
          { href: "/admin/promos", label: "Promo codes" },
          { href: "/admin/subscribers", label: "Subscribers" },
          { href: "/admin/alerts", label: "Back in stock", badge: marketing.backInStock },
          { href: "/admin/settings", label: "Shop settings" },
        ]}
        footer={
          <>
            <Link href="/" target="_blank" className="underline">View shop</Link>
            <form action={logout}><button type="submit" className="underline">Sign out</button></form>
          </>
        }
      />
      <main className="min-h-dvh min-w-0 bg-plaster px-4 py-8 sm:px-8">{children}</main>
      <Suspense fallback={null}><AdminFlash /></Suspense>
      <Toaster consentAware={false} />
    </div>
  );
}
