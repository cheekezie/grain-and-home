import AdminList, { PageHead } from "@/components/admin/AdminList";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CATEGORIES } from "@/lib/catalogue";
import RoomContentModel from "@/models/RoomContent";

export const metadata = { title: "Room pages" };

export default async function RoomsPage() {
  await requireAdmin();
  await connectDB();
  const docs = new Map((await RoomContentModel.find().lean()).map((d) => [d.slug as string, d]));
  return (
    <div className="w-full">
      <PageHead title="Room pages" />
      <p className="mt-4 max-w-2xl text-[15px] text-muted">
        The words on each room page. A short intro, a search description for Google, and a buying guide below the products help both
        shoppers and search rankings.
      </p>
      <AdminList
        empty=""
        rows={CATEGORIES.map((c) => {
          const d = docs.get(c.slug);
          const words = d?.guide ? String(d.guide).trim().split(/\s+/).length : 0;
          const issues = [!d?.metaDescription && "No search description", !words && "No buying guide"].filter((x): x is string => !!x);
          return { href: `/admin/rooms/${c.slug}`, title: c.name, sub: `/shop/${c.slug}`, meta: words ? `Guide: ${words} words` : undefined, issues };
        })}
      />
    </div>
  );
}
