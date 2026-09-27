"use client";

// − [n] + quantity control. The number is also typeable; values are kept
// between min and max (the basket caps each line at 20).
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Accessible name, e.g. "Quantity for Oak desk". */
  label: string;
  size?: "sm" | "md";
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n) || min));
  const box = size === "sm" ? "h-9" : "h-11";
  const btn = `flex ${size === "sm" ? "w-9" : "w-11"} items-center justify-center text-xl leading-none hover:bg-plaster disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent`;
  return (
    <div role="group" aria-label={label} className={`inline-flex ${box} items-stretch overflow-hidden rounded-full border border-line bg-white`}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Decrease quantity" className={btn}>
        <span aria-hidden>−</span>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => e.target.value !== "" && onChange(clamp(Number(e.target.value)))}
        aria-label="Quantity"
        className={`tabular ${size === "sm" ? "w-9" : "w-12"} border-x border-line bg-transparent text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Increase quantity" className={btn}>
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}
