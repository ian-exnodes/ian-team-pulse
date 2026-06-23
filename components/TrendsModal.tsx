"use client";

import { useEffect } from "react";
import type { ReportRange } from "@/lib/report";
import type { CompletionSummary } from "@/lib/trends";

// Numeric completions panel: how many tasks each member finished in the chosen
// range, ranked, with a team total. Same Today/This-week ranges as the report.
export function TrendsModal({
  open,
  onClose,
  summary,
  range,
  onRangeChange,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  summary: CompletionSummary;
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  loading: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  const max = summary.perPerson.reduce((m, p) => Math.max(m, p.count), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-olivia-border bg-olivia-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-olivia-cream">
            Completed work
          </h2>
          <button
            onClick={onClose}
            className="text-olivia-muted hover:text-olivia-cream"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-1 self-start rounded-lg border border-olivia-border bg-olivia-bg p-1">
          {(
            [
              ["day", "Today"],
              ["week", "This week"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onRangeChange(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                range === value
                  ? "bg-olivia-pink text-olivia-bg"
                  : "text-olivia-muted hover:text-olivia-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="text-sm text-olivia-muted">Loading…</p>
          ) : summary.perPerson.length === 0 ? (
            <p className="text-sm text-olivia-muted">
              {range === "week"
                ? "Nothing completed in the last 7 days."
                : "Nothing completed today yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.perPerson.map((p) => (
                <li key={p.profileId} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-olivia-cream">
                    {p.name}
                  </span>
                  <span
                    className="h-2 rounded-full bg-olivia-pink"
                    style={{
                      width: `${max ? Math.max(8, (p.count / max) * 100) : 0}%`,
                    }}
                  />
                  <span className="ml-auto text-sm font-semibold text-olivia-cream">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!loading && summary.perPerson.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-olivia-border pt-3 text-sm">
            <span className="text-olivia-muted">Team total</span>
            <span className="font-semibold text-olivia-cream">
              {summary.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
