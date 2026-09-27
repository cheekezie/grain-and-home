import Link from "next/link";
import { StatusBadge } from "./AdminList";
import BackLink from "./BackLink";

export default function EditHeader({
  backHref,
  backLabel,
  title,
  status,
  liveHref,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  status?: "draft" | "published";
  liveHref?: string;
}) {
  return (
    <div className="mb-8">
      <BackLink href={backHref} label={backLabel} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        {status && <StatusBadge status={status} />}
      </div>
      {liveHref && status === "published" && (
        <Link href={liveHref} target="_blank" className="mt-2 inline-block text-[14px] font-semibold text-accent underline">
          View on the site
        </Link>
      )}
    </div>
  );
}
