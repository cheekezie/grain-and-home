import Link from "next/link";

// "← Back to …" at the top of inner shop pages (product, basket, checkout):
// the arrow shows it's a link that goes back a step.
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 py-1 pr-2 text-[14px] font-semibold text-muted hover:text-ink">
      <svg aria-hidden viewBox="0 0 20 20" className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 10H4M9 5l-5 5 5 5" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
