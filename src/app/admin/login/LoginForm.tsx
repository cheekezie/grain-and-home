"use client";

import { useActionState, useRef } from "react";
import { login } from "../actions";
import type { FormState } from "@/lib/admin/schemas";

// 6-digit access code: one box, numeric keypad on phones, hidden as you
// type, and it signs in by itself once the sixth digit is entered.
export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <label htmlFor="code" className="block font-semibold">Access code</label>
        <p className="text-[14px] text-muted">6 digits</p>
        <input
          id="code"
          name="code"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          autoComplete="current-password"
          aria-describedby={state?.message ? "login-error" : undefined}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
            if (e.target.value.length === 6 && !pending) formRef.current?.requestSubmit();
          }}
          className="tabular mt-1.5 w-full rounded-lg border border-line px-3 py-3 text-center text-2xl tracking-[0.6em]"
        />
      </div>
      {state?.message && (
        <p id="login-error" role="alert" className="font-semibold text-danger">{state.message}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
