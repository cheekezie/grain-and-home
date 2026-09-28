"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/admin/schemas";
import { showToast } from "@/lib/toast";

// Every editor keeps its record in React state and posts it as one JSON
// payload; the server action validates it with zod and returns per-field
// errors, which fields read back through ErrorsContext by path.

const ErrorsContext = createContext<Record<string, string>>({});

export function useFieldError(path: string): string | undefined {
  return useContext(ErrorsContext)[path];
}

/** First error at `path` or any path nested under it (e.g. "pros.2"). */
export function useNestedFieldError(path: string): string | undefined {
  const errors = useContext(ErrorsContext);
  const key = Object.keys(errors).find((k) => k === path || k.startsWith(`${path}.`));
  return key ? errors[key] : undefined;
}

export default function EditorForm({
  action,
  payload,
  children,
  justCreated = false,
  aside,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  payload: unknown;
  children: React.ReactNode;
  justCreated?: boolean;
  aside?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const json = JSON.stringify(payload);
  const [savedJson, setSavedJson] = useState(json);
  const submitted = useRef(json);
  const dirty = json !== savedJson;
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Once a save succeeds, what was submitted becomes the new baseline.
  useEffect(() => {
    if (state?.ok) {
      setSavedJson(submitted.current);
      showToast({ title: (state.message || "Saved").replace(/\.$/, "") });
    }
    if (state) statusRef.current?.focus();
  }, [state]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const message = state?.message ?? (justCreated ? "Created." : null);

  return (
    <ErrorsContext.Provider value={state?.errors ?? {}}>
      <form
        // Submitted by hand rather than with `action`: React resets a form after
        // its action runs, which leaves controlled <select>s showing their first
        // option while the editor still holds the real value.
        onSubmit={(e) => {
          e.preventDefault();
          submitted.current = json;
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <input type="hidden" name="payload" value={json} />
        <div className="min-w-0 space-y-8">{children}</div>
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-line bg-white p-4">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <p
              ref={statusRef}
              tabIndex={-1}
              role="status"
              className={`mt-3 text-[14px] outline-none ${state && !state.ok ? "font-semibold text-danger" : ""}`}
            >
              {state && !state.ok ? state.message : dirty ? "Unsaved changes" : (message ?? "No changes")}
            </p>
            {state?.errors && (
              <ul className="mt-2 list-[square] space-y-1 pl-5 text-[14px]">
                {Object.entries(state.errors).map(([path, msg]) => (
                  <li key={path}>
                    <span className="font-semibold">{fieldName(path)}:</span> {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {aside}
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

/** "activities.2.image.credit" → "Activity 3 photo credit" */
function fieldName(path: string): string {
  const LABELS: Record<string, string> = {
    slug: "Web address", summary: "Summary", description: "Description", images: "Photo", url: "URL", alt: "description",
    price: "Price", supplierCost: "Supplier cost", returnCost: "Return cost", supplierId: "Supplier", supplierUrl: "Supplier link",
    supplierSku: "Supplier code", widthCm: "Width", depthCm: "Depth", heightCm: "Height", weightKg: "Weight",
    deliveryEstimate: "Delivery time", orderUrl: "Ordering page", contactEmail: "Contact email", website: "Website",
    items: "Link", children: "dropdown link", href: "address", label: "text", primary: "main button", secondary: "second button",
    details: "Details", fields: "Detail",
  };
  const parts = path.split(".");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d+$/.test(p)) {
      if (out.length) out[out.length - 1] += ` ${Number(p) + 1}`;
      continue;
    }
    out.push(LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1));
  }
  return out.join(" ");
}
