import Image from "next/image";
import { isOptimisable } from "@/lib/imageHosts";

// Product photo that fills its (positioned) parent. Photos from known
// supplier hosts go through Next.js image optimisation (resized to the
// displayed size, WebP/AVIF); any other https photo pasted in the admin
// still shows, unoptimised, rather than breaking the page.
export default function ShopImage({
  src,
  alt,
  sizes,
  className,
  style,
  eager = false,
  draggable,
}: {
  src: string;
  alt: string;
  /** What width the photo is shown at, e.g. "(min-width: 768px) 25vw, 50vw". */
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  /** Above-the-fold images (the main product photo): load at once, high priority. */
  eager?: boolean;
  draggable?: boolean;
}) {
  if (!isOptimisable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`absolute inset-0 size-full ${className ?? ""}`} style={style} loading={eager ? "eager" : "lazy"} draggable={draggable} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      draggable={draggable}
    />
  );
}
