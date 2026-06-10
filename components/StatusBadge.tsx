import type { DerivedStatus } from "@/lib/types";

// GMK Olivia mapping: pink = actively working, cream outline = chill,
// muted = off.
const STYLES: Record<DerivedStatus, { label: string; className: string }> = {
  off: {
    label: "Off",
    className: "bg-olivia-raised text-olivia-muted",
  },
  inprogress: {
    label: "In Progress",
    className: "bg-olivia-pink text-olivia-bg",
  },
  chill: {
    label: "Chill",
    className: "border border-olivia-border bg-transparent text-olivia-cream",
  },
};

export function StatusBadge({ status }: { status: DerivedStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
