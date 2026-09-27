import { notFound } from "next/navigation";
import EditHeader from "@/components/admin/EditHeader";
import { RoomEditor } from "@/components/admin/editors";
import { saveRoom } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CATEGORIES } from "@/lib/catalogue";
import RoomContentModel from "@/models/RoomContent";

export default async function EditRoomPage({ params }: PageProps<"/admin/rooms/[slug]">) {
  await requireAdmin();
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();
  await connectDB();
  const d = await RoomContentModel.findOne({ slug }).lean();
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/rooms" backLabel="Room pages" title={cat.name} />
      <RoomEditor
        action={saveRoom.bind(null, slug)}
        roomName={cat.name}
        defaultBlurb={cat.blurb}
        initial={{ intro: (d?.intro as string) ?? "", metaDescription: (d?.metaDescription as string) ?? "", guide: (d?.guide as string) ?? "" }}
      />
    </div>
  );
}
