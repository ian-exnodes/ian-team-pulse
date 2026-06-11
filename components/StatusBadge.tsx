import type { DerivedStatus } from "@/lib/types";

// Vivid highlights so status reads at a glance: neon green = working,
// cyan = chill, muted = off. In Progress animates (breathing glow + ping
// dot) so "live right now" is unmistakable.
const STYLES: Record<DerivedStatus, { label: string; className: string }> = {
  off: {
    label: "Off",
    className: "bg-olivia-raised text-olivia-muted",
  },
  inprogress: {
    label: "In Progress",
    className: "animate-status-glow bg-status-active font-semibold text-olivia-bg",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status === "inprogress" && (
        <span aria-hidden className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olivia-bg opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-olivia-bg" />
        </span>
      )}
      {label}
    </span>
  );
}
