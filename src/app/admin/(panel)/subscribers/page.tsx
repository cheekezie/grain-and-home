import Link from "next/link";
import { PageHead } from "@/components/admin/AdminList";
import { adminSubscribers } from "@/lib/admin/queries";

export const metadata = { title: "Email subscribers" };

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export default async function SubscribersPage() {
  const subs = await adminSubscribers();
  const active = subs.filter((s) => !s.unsubscribed);
  return (
    <div className="w-full">
      <PageHead title="Email subscribers" />
      <p className="mt-4 max-w-2xl text-[15px]">
        People who signed up for offers and new pieces. The shop doesn&rsquo;t send emails itself: download the list into a mail
        provider, and include each person&rsquo;s unsubscribe link (in the CSV) in every email.
      </p>
      {active.length > 0 && (
        <Link href="/admin/subscribers/export" prefetch={false} className="mt-4 inline-block rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:border-ink">
          Download CSV ({active.length})
        </Link>
      )}
      {subs.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-white p-5">No subscribers yet. The sign-up form is in the shop footer.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-line text-[13px] text-muted">
              <tr><th className="p-3">Email</th><th className="p-3">From</th><th className="p-3">Signed up</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{s.source}</td>
                  <td className="whitespace-nowrap p-3">{s.createdAt ? fmt.format(new Date(s.createdAt)) : ""}</td>
                  <td className="p-3">{s.unsubscribed ? <span className="text-muted">Unsubscribed</span> : "Subscribed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
