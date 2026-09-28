"use client";

import { useId, useState, useTransition } from "react";
import type { ProductImage } from "@/lib/types";
import { marginPercent, parsePounds } from "@/lib/money";
import { useFieldError, useNestedFieldError } from "./EditorForm";
import { CURRENCY_SYMBOL, formatPrice } from "@/lib/money";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-[16px] aria-[invalid=true]:border-danger";

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="block font-semibold">
        {label}
      </label>
      {hint && <p className="text-[14px] text-muted">{hint}</p>}
    </>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1 text-[14px] font-semibold text-danger">
      {error}
    </p>
  ) : null;
}

export function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5 rounded-xl border border-line bg-white p-5">
      <legend className="px-1 font-display text-2xl">{title}</legend>
      {hint && <p className="-mt-2 text-[14px] text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function TextField({
  label,
  path,
  value,
  onChange,
  hint,
  multiline = false,
  rows = 4,
  type = "text",
  placeholder,
  mono = false,
}: {
  label: string;
  path: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "url" | "date" | "number";
  placeholder?: string;
  mono?: boolean;
}) {
  const id = useId();
  const error = useFieldError(path);
  const common = {
    id,
    value,
    placeholder,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-err` : undefined,
    className: `${inputClass} ${mono ? "font-mono text-[15px]" : ""}`,
  };
  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint} />
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} onChange={(e) => onChange(e.target.value)} />
      )}
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  path,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  path: string;
  value: string;
  onChange: (v: string) => void;
  /** Options with a `group` are listed under that heading (<optgroup>), in order of first appearance. */
  options: { value: string; label: string; group?: string }[];
  hint?: string;
}) {
  const id = useId();
  const error = useFieldError(path);
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const render = (o: { value: string; label: string }) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  );
  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} aria-invalid={!!error}>
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map(render)}
            </optgroup>
          ) : (
            options.filter((o) => !o.group).map(render)
          ),
        )}
      </select>
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-accent" />
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-[14px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function StatusField({ value, onChange }: { value: "draft" | "published"; onChange: (v: "draft" | "published") => void }) {
  return (
    <fieldset>
      <legend className="font-semibold">Visibility</legend>
      <div className="mt-2 flex gap-3">
        {(["draft", "published"] as const).map((s) => (
          <label
            key={s}
            className={`cursor-pointer rounded-full border border-line px-4 py-1.5 font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
              value === s ? (s === "published" ? "border-accent bg-accent text-white" : "border-ink bg-ink text-white") : "bg-white"
            }`}
          >
            <input type="radio" name="status-radio" className="sr-only" checked={value === s} onChange={() => onChange(s)} />
            {s === "draft" ? "Draft" : "Published"}
          </label>
        ))}
      </div>
      <p className="mt-1 text-[14px] text-muted">
        {value === "draft" ? "Only visible here in the admin." : "Live on the site once saved."}
      </p>
    </fieldset>
  );
}

/** One string per line, e.g. pros/cons or airport codes. */
export function LinesField({
  label,
  path,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  label: string;
  path: string;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
  rows?: number;
}) {
  const [text, setText] = useState(value.join("\n"));
  const errors = useNestedFieldError(path);
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint ?? "One per line."} />
      <textarea
        id={id}
        rows={rows}
        value={text}
        aria-invalid={!!errors}
        className={inputClass}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
        }}
      />
      <FieldError id={`${id}-err`} error={errors} />
    </div>
  );
}

export function DeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border border-danger/30 bg-white p-4">
      {confirming ? (
        <>
          <p className="text-[14px] font-semibold">Delete {label} permanently? This can&rsquo;t be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(action)}
              className="rounded-lg bg-danger px-3 py-2 font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-line px-3 py-2 font-semibold">
              Keep it
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="font-semibold text-danger underline">
          Delete {label}
        </button>
      )}
    </div>
  );
}

/** Money typed in pounds ("249.99"), stored as a string until save; the schema converts to pence. */
export function MoneyField({
  label,
  path,
  value,
  onChange,
  hint,
}: {
  label: string;
  path: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  const error = useFieldError(path);
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">{label}</label>
      {hint && <p className="text-[14px] text-muted">{hint}</p>}
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{CURRENCY_SYMBOL}</span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="tabular w-full rounded-xl border border-line bg-white py-2 pl-7 pr-3 text-[16px] aria-[invalid=true]:border-danger"
        />
      </div>
      {error && <p className="mt-1 text-[14px] font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** Live margin readout for the product editor. */
export function MarginNote({ price, cost }: { price: string; cost: string }) {
  const p = parsePounds(price);
  const c = parsePounds(cost);
  if (Number.isNaN(p) || Number.isNaN(c) || p <= 0) return <p className="text-[14px] text-muted">Enter a price and supplier cost to see the margin.</p>;
  const m = marginPercent(p, c)!;
  return (
    <p className={`tabular text-[15px] font-semibold ${m < 20 ? "text-danger" : ""}`}>
      Margin {m}% ({formatPrice(p - c)} per sale, before payment fees and any delivery you pay)
    </p>
  );
}

/**
 * Product photos as URLs (e.g. the supplier's image links). First photo is
 * the main one. Only use images the supplier lets resellers use.
 */
export function ImagesField({
  path,
  value,
  onChange,
  valueChoices = [],
}: {
  path: string;
  value: ProductImage[];
  onChange: (v: ProductImage[]) => void;
  /** The product's option values ("Pink", "XL"…): a photo can be tagged with one, so it shows when that's chosen. */
  valueChoices?: string[];
}) {
  const [url, setUrl] = useState("");
  const error = useFieldError(path);
  const itemError = useNestedFieldError(path);
  const add = () => {
    const u = url.trim();
    if (!/^https:\/\//.test(u)) return;
    onChange([...value, { url: u, alt: "" }]);
    setUrl("");
  };
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div>
      <p className="font-semibold">Photos</p>
      <p className="text-[14px] text-muted">Paste image links from your supplier (https). The first photo is the main one. Only use photos the supplier allows resellers to use.</p>
      {value.length > 0 && (
        <ul className="mt-3 space-y-3">
          {value.map((img, i) => (
            <li key={img.url + i} className="flex gap-3 rounded-xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-plaster object-contain" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate font-mono text-[13px] text-muted">{img.url}</p>
                <input
                  aria-label={`Description of photo ${i + 1}`}
                  placeholder="Describe the photo, e.g. Oak desk, front view"
                  value={img.alt}
                  onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-[15px]"
                />
                {valueChoices.length > 0 && (
                  <label className="flex items-center gap-2 text-[14px]">
                    <span className="shrink-0 text-muted">Variant</span>
                    <select
                      value={img.forValue && valueChoices.includes(img.forValue) ? img.forValue : ""}
                      onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, forValue: e.target.value || undefined } : x)))}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1.5"
                    >
                      <option value="">All variants</option>
                      {valueChoices.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex gap-3 text-[14px] font-semibold">
                  {i === 0 ? <span className="text-moss">Main photo</span> : <button type="button" onClick={() => move(i, -1)} className="underline">Move up</button>}
                  {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} className="underline">Move down</button>}
                  <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-danger underline">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="https://…/photo.jpg"
          className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 font-mono text-[14px]"
        />
        <button type="button" onClick={add} className="shrink-0 rounded-lg bg-ink px-4 font-semibold text-white">Add photo</button>
      </div>
      {(error || itemError) && <p className="mt-1 text-[14px] font-semibold text-danger">{error || itemError}</p>}
    </div>
  );
}
