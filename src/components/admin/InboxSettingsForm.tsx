"use client";

import { useState, useTransition } from "react";
import { saveInboxSettings, testInboxSettings } from "@/app/admin/actions";
import { showToast } from "@/lib/toast";

type Provider = { value: string; label: string };

export default function InboxSettingsForm({
  initial,
  providers,
}: {
  initial: { address: string; hasPassword: boolean; provider: string; imapHost: string; imapPort: number; lastTestOk?: boolean; lastTestMessage?: string };
  providers: Provider[];
}) {
  const [address, setAddress] = useState(initial.address);
  const [password, setPassword] = useState("");
  const [provider, setProvider] = useState(initial.provider);
  const [host, setHost] = useState(initial.imapHost);
  const [port, setPort] = useState(String(initial.imapPort || 993));
  const [status, setStatus] = useState<{ ok?: boolean; message?: string }>({ ok: initial.lastTestOk, message: initial.lastTestMessage });
  const [pending, start] = useTransition();
  const input = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveInboxSettings({ address, password, provider, imapHost: host, imapPort: port });
          setStatus(r);
          if (r.ok) setPassword("");
          showToast({ title: r.ok ? "Ordering inbox saved and connected" : "Saved, but couldn't connect" });
        });
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <label className="text-[14px] font-semibold">
        Email address
        <input type="email" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="orders@grainandhome.co.uk" className={input} autoComplete="off" />
      </label>
      <label className="text-[14px] font-semibold">
        App password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={initial.hasPassword ? "Saved (leave empty to keep it)" : "App-specific password"}
          className={input}
          autoComplete="new-password"
        />
        <span className="mt-1 block text-[12px] font-normal text-muted">Not your login password: create an app password in the account&rsquo;s security settings. Stored encrypted; never shown again.</span>
      </label>
      <label className="text-[14px] font-semibold">
        Provider
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className={input}>
          {providers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </label>
      {provider === "other" ? (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <label className="text-[14px] font-semibold">
            IMAP server
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.example.com" className={input} />
          </label>
          <label className="text-[14px] font-semibold">
            Port
            <input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" className={input} />
          </label>
        </div>
      ) : (
        <div />
      )}
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-moss px-4 py-2 font-semibold text-white hover:bg-moss-deep disabled:opacity-60">
          {pending ? "Saving and testing…" : "Save and test"}
        </button>
        {initial.hasPassword && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { const r = await testInboxSettings(); setStatus(r); showToast({ title: r.ok ? "Connection works" : "Connection failed" }); })}
            className="rounded-lg border border-line bg-white px-4 py-2 font-semibold hover:border-ink disabled:opacity-60"
          >
            Test connection
          </button>
        )}
        {status.message && (
          <p role="status" className={`text-[14px] ${status.ok ? "text-moss" : "font-semibold text-danger"}`}>
            {status.ok ? "✓ " : ""}{status.message}
          </p>
        )}
      </div>
    </form>
  );
}
