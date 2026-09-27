"use client";

import { useActionState } from "react";
import { login } from "../actions";
import type { FormState } from "@/lib/admin/schemas";

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={action} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <label htmlFor="password" className="block font-semibold">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-describedby={state?.message ? "login-error" : undefined}
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2"
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
