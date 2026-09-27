type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function TruckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l4 3v3h-8z" />
      <circle cx="6.5" cy="18" r="1.75" />
      <circle cx="16.5" cy="18" r="1.75" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function HeadsetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 13v-1a8 8 0 0116 0v1" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M19.5 19v.5A3.5 3.5 0 0116 23h-2.5" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  );
}
