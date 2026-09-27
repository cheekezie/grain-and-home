import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-plaster px-4">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl">{siteConfig.name}</p>
        <h1 className="mt-3 text-xl font-semibold">Sign in to the admin</h1>
        <LoginForm />
      </div>
    </div>
  );
}
