import type { DerivedStatus } from "@/lib/types";

// Vivid highlights so status reads at a glance: neon green = working,
// cyan = chill, muted = off.
const STYLES: Record<DerivedStatus, { label: string; className: string }> = {
  off: {
    label: "Off",
    className: "bg-olivia-raised text-olivia-muted",
  },
  inprogress: {
    label: "In Progress",
    className:
      "bg-status-active font-semibold text-olivia-bg shadow-[0_0_12px_-1px_rgba(69,224,122,0.7)]",
  },
  chill: {
    label: "Chill",
    className: "border border-status-chill/40 bg-status-chill/10 text-status-chill",
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
