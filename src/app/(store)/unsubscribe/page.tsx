import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unsubscribe } from "../actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// Unsubscribing takes a button press (a POST), so link scanners in email
// clients that open every link can't unsubscribe people by accident.
export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const { token, done } = await searchParams;
  const t = typeof token === "string" ? token : "";
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl">Unsubscribe</h1>
      {done === "1" ? (
        <p className="mt-4 text-lg">You&rsquo;re unsubscribed. We won&rsquo;t email you offers again.</p>
      ) : done === "0" ? (
        <p className="mt-4">That link didn&rsquo;t work. Reply to any of our emails and we&rsquo;ll remove you.</p>
      ) : (
        <form
          action={async () => {
            "use server";
            const ok = await unsubscribe(t);
            redirect(`/unsubscribe?done=${ok ? "1" : "0"}`);
          }}
          className="mt-6"
        >
          <p>Stop receiving offer emails from us?</p>
          <button type="submit" className="mt-4 rounded-full bg-ink px-6 py-3 font-semibold text-white">Unsubscribe</button>
        </form>
      )}
    </div>
  );
}
