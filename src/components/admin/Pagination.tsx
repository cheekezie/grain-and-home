import Link from "next/link";

// "Showing 26–50 of 312" with previous/next and page numbers; keeps other
// query parameters (e.g. the tab).
export default function Pagination({
  path,
  params,
  page,
  perPage,
  total,
}: {
  path: string;
  params: Record<string, string>;
  page: number;
  perPage: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;
  const href = (p: number) => `${path}?${new URLSearchParams({ ...params, ...(p > 1 ? { page: String(p) } : {}) })}`;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  // Page numbers around the current one: 1 … 4 5 6 … 13
  const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const link = "rounded-lg border border-line bg-white px-3 py-1.5 text-[14px] font-semibold hover:border-ink";
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-[14px] text-muted">Showing {from}–{to} of {total}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? <Link href={href(page - 1)} className={link}>← Previous</Link> : <span className={`${link} opacity-40`} aria-disabled>← Previous</span>}
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && n - nums[i - 1] > 1 && <span className="text-muted">…</span>}
            <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`tabular ${link} ${n === page ? "border-ink bg-ink text-white hover:border-ink" : ""}`}>
              {n}
            </Link>
          </span>
        ))}
        {page < pages ? <Link href={href(page + 1)} className={link}>Next →</Link> : <span className={`${link} opacity-40`} aria-disabled>Next →</span>}
      </div>
    </nav>
  );
}
