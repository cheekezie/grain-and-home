import { getShopSettings } from "@/lib/shop/server";
import { gridClass, masonryClass } from "./gridClasses";

/**
 * The layout around product cards: a regular grid, or staggered columns when
 * the shop's cards are "masonry" (Shop settings → Look). `cols` is the widest
 * number of columns (4 on the home page, 3–4 on category pages).
 */
export default async function ProductGrid({ children, cols = 4, className = "" }: { children: React.ReactNode; cols?: 3 | 4; className?: string }) {
  const masonry = (await getShopSettings()).theme?.cards === "masonry";
  return <div className={`${masonry ? masonryClass(cols) : gridClass(cols)} ${className}`}>{children}</div>;
}

