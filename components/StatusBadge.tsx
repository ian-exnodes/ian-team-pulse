import type { DerivedStatus } from "@/lib/types";

const STYLES: Record<DerivedStatus, { label: string; className: string }> = {
  off: { label: "Off", className: "bg-slate-200 text-slate-600" },
  inprogress: { label: "In Progress", className: "bg-green-100 text-green-700" },
  chill: { label: "Chill", className: "bg-blue-100 text-blue-700" },
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
