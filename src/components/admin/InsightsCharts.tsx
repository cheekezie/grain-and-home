"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Charts for the Insights page. Every chart has a table with the same
// numbers on the page, so nothing depends on reading a chart.

const MOSS = "var(--moss)";
const MOSS_LIGHT = "#a9bcae";
const DANGER = "var(--danger)";
const INK_MUTED = "var(--muted)";

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: Math.abs(pence) < 10000 ? 2 : 0 }).format(pence / 100);
const gbpAxis = (pence: number) => {
  if (Math.abs(pence) < 100000) return `£${Math.round(pence / 100)}`;
  const k = pence / 100000;
  return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--line)", fontSize: 14 } as const;

export function RevenueProfitChart({ data }: { data: { label: string; revenue: number; profit: number; orders: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={gbpAxis} tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--plaster)" }}
            formatter={(v, name) => [gbp(Number(v)), name === "revenue" ? "Revenue" : "Profit"]}
            labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.orders ?? 0} order${p?.[0]?.payload?.orders === 1 ? "" : "s"}`}
          />
          <Legend formatter={(v) => <span style={{ color: "var(--ink)" }}>{v === "revenue" ? "Revenue" : "Profit"}</span>} iconType="circle" wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="revenue" fill={MOSS_LIGHT} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="profit" fill={MOSS} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }: { data: { name: string; revenue: number; profit: number | null }[] }) {
  const rows = data.map((d) => ({ ...d, short: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name, profit: d.profit ?? 0 }));
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 44 + 40) }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tickFormatter={gbpAxis} tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="short" width={170} tick={{ fontSize: 12, fill: "var(--ink)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--plaster)" }} formatter={(v, name) => [gbp(Number(v)), name === "revenue" ? "Revenue" : "Profit"]} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""} />
          <Bar dataKey="revenue" fill={MOSS_LIGHT} radius={[0, 4, 4, 0]} maxBarSize={16} />
          <Bar dataKey="profit" fill={MOSS} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Margin % per product as set in the admin, in the order given (best sellers first); thin margins in red. */
export function MarginChart({ data, threshold }: { data: { name: string; marginPct: number | null; live: boolean; unitsSold: number }[]; threshold: number }) {
  const rows = data
    .filter((d) => d.marginPct != null)
    .map((d) => ({ ...d, short: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name }));
  const top = Math.max(50, Math.ceil(Math.max(0, ...rows.map((r) => r.marginPct ?? 0)) / 10) * 10);
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 30 + 40) }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" domain={[0, top]} ticks={Array.from({ length: top / 10 + 1 }, (_, i) => i * 10)} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="short" width={170} tick={{ fontSize: 12, fill: "var(--ink)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--plaster)" }} formatter={(v) => [`${v}%`, "Margin"]} labelFormatter={(_, p) => { const r = p?.[0]?.payload; return r ? `${r.name}${r.live ? "" : " (draft)"} · ${r.unitsSold} sold` : ""; }} />
          <Bar dataKey="marginPct" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {rows.map((r) => (
              <Cell key={r.name} fill={(r.marginPct ?? 0) < threshold ? DANGER : r.live ? MOSS : MOSS_LIGHT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
