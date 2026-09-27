"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductImage } from "@/lib/types";

const HOVER_ZOOM = 2;
const VIEWER_ZOOM = 2.5;

// Product photos. Desktop: hovering the main photo magnifies it under the
// cursor. Clicking (or tapping on a phone) opens a full-screen viewer:
// tap/click to zoom in at that point, move or drag to look around, arrow
// keys or buttons for the next photo, Escape to close.
export default function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [viewer, setViewer] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  if (images.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-2xl bg-plaster text-muted">Photo coming soon</div>;
  }
  const index = Math.min(i, images.length - 1);
  const current = images[index];

  return (
    <div>
      <button
        ref={opener}
        type="button"
        onClick={() => { setHover(null); setViewer(true); }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setHover({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setHover(null)}
        aria-label={`Zoom in: open photo ${index + 1} of ${images.length} full screen`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-plaster"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt || name}
          loading="eager"
          className="absolute inset-0 h-full w-full object-contain p-8 mix-blend-multiply transition-transform duration-150 ease-out motion-reduce:transition-none"
          style={hover ? { transform: `scale(${HOVER_ZOOM})`, transformOrigin: `${hover.x}% ${hover.y}%` } : undefined}
        />
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-opacity group-hover:opacity-0">
          <MagnifierIcon /> Zoom
        </span>
      </button>

      {images.length > 1 && (
        <Thumbnails images={images} index={index} onPick={setI} />
      )}

      {viewer && (
        <Viewer
          images={images}
          name={name}
          index={index}
          onIndex={setI}
          onClose={() => { setViewer(false); opener.current?.focus(); }}
        />
      )}
    </div>
  );
}

function Thumbnails({ images, index, onPick, dark }: { images: ProductImage[]; index: number; onPick: (n: number) => void; dark?: boolean }) {
  return (
    <ul className={dark ? "flex justify-center gap-2 overflow-x-auto" : "mt-3 grid grid-cols-5 gap-2"}>
      {images.map((img, n) => (
        <li key={img.url} className={dark ? "shrink-0" : undefined}>
          <button
            type="button"
            onClick={() => onPick(n)}
            aria-label={`Show photo ${n + 1} of ${images.length}`}
            aria-current={n === index}
            className={`relative block aspect-square overflow-hidden rounded-lg bg-plaster ring-2 ${dark ? "w-14" : "w-full"} ${n === index ? "ring-ink" : "ring-transparent hover:ring-line"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5 mix-blend-multiply" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Viewer({ images, name, index, onIndex, onClose }: { images: ProductImage[]; name: string; index: number; onIndex: (n: number) => void; onClose: () => void }) {
  // Zoom origin in % of the photo frame; null = not zoomed.
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const many = images.length > 1;
  const current = images[index];

  const go = (d: number) => { setZoom(null); onIndex((index + d + images.length) % images.length); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) { setZoom(null); onIndex((index + 1) % images.length); }
      else if (e.key === "ArrowLeft" && many) { setZoom(null); onIndex((index - 1 + images.length) % images.length); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [index, images.length, many, onClose, onIndex]);

  useEffect(() => { closeButton.current?.focus(); }, []);

  const pointAt = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const clampPct = (n: number) => Math.min(100, Math.max(0, n));

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${name}: photo ${index + 1} of ${images.length}`} className="fixed inset-0 z-[70] flex flex-col bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="tabular text-[15px] text-muted">{many ? `${index + 1} / ${images.length}` : name}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(zoom ? null : { x: 50, y: 50 })}
            className="rounded-full border border-line px-4 py-2 text-[15px] font-semibold hover:border-ink"
          >
            {zoom ? "Zoom out" : "Zoom in"}
          </button>
          <button ref={closeButton} type="button" onClick={onClose} className="rounded-full bg-ink px-4 py-2 text-[15px] font-semibold text-white">
            Close
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 touch-none select-none overflow-hidden ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onPointerDown={(e) => {
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!zoom) return;
            const d = drag.current;
            if (e.pointerType === "mouse" && !d) {
              setZoom(pointAt(e)); // desktop: look where the cursor is
              return;
            }
            if (!d || d.id !== e.pointerId) return;
            // touch or mouse drag: move the view opposite to the finger
            const r = e.currentTarget.getBoundingClientRect();
            const dx = ((e.clientX - d.x) / r.width) * 100 / (VIEWER_ZOOM - 1);
            const dy = ((e.clientY - d.y) / r.height) * 100 / (VIEWER_ZOOM - 1);
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
            drag.current = { ...d, x: e.clientX, y: e.clientY };
            setZoom({ x: clampPct(zoom.x - dx), y: clampPct(zoom.y - dy) });
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (d?.moved) return;
            setZoom(zoom ? null : pointAt(e));
          }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt || name}
            draggable={false}
            className="h-full w-full object-contain p-4 transition-transform duration-200 ease-out motion-reduce:transition-none sm:p-10"
            style={zoom ? { transform: `scale(${VIEWER_ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </div>
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-xl hover:border-ink">
              <span aria-hidden>‹</span>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-xl hover:border-ink">
              <span aria-hidden>›</span>
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 sm:px-6">
        {many && <Thumbnails images={images} index={index} onPick={(n) => { setZoom(null); onIndex(n); }} dark />}
        <p className="mt-2 text-center text-[13px] text-muted">{zoom ? "Drag or move to look around. Tap to zoom out." : "Tap the photo to zoom in."}</p>
      </div>
    </div>,
    document.body,
  );
}

function MagnifierIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 17 17M8.5 6v5M6 8.5h5" />
    </svg>
  );
}
