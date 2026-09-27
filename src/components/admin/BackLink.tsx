import Link from "next/link";

// "← Section" link at the top of inner admin pages. The arrow shows it goes
// back up a level; the label names where it goes.
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 rounded-full py-1 pr-2 text-[14px] font-semibold text-muted hover:text-ink">
      <svg aria-hidden viewBox="0 0 20 20" className="size-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 10H4M9 5l-5 5 5 5" />
      </svg>
      <span>Back to {label.charAt(0).toLowerCase() + label.slice(1)}</span>
    </Link>
  );
}
