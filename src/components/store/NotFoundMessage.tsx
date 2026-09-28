"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The 404 headline, worded for what was missing: a product, a category or
// any other page. Reads the address the visitor tried.
export default function NotFoundMessage({ categoryLabel, storeName }: { categoryLabel: string; storeName: string }) {
  const path = usePathname() ?? "";
  // Not-found pages can't set head tags from the server here, so name the tab once loaded.
  useEffect(() => {
    document.title = `Page not found | ${storeName}`;
  }, [storeName]);
  const [title, text] = path.startsWith("/products/")
    ? ["That product isn’t here any more.", "It may have sold out or been taken down. Have a look at what’s in the shop now."]
    : path.startsWith("/shop/")
      ? [`We can’t find that ${categoryLabel.toLowerCase()}.`, "It may have been renamed or moved. Everything we sell is below."]
      : ["We can’t find that page.", "It may have moved, or the address may be mistyped. Try one of these instead."];
  return (
    <>
      <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.04]">{title}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">{text}</p>
    </>
  );
}
