import { notFound } from "next/navigation";

// Any address no other page matches: show the shop's own 404 (not-found.tsx)
// inside the shop layout, instead of a bare page outside it.
export default function Missing() {
  notFound();
}
