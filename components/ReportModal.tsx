"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportRange } from "@/lib/report";

// Colorized rendering for one report line: link in pink, title in cream,
// status muted (done gets the deeper pink). Copying still uses the plain
// `text` string - colors are display-only.
function ReportLine({ line }: { line: string }) {
  const statusMatch = line.match(/ \( (done|inprogress) \)$/);
  const status = statusMatch?.[1];
  const head = statusMatch ? line.slice(0, -statusMatch[0].length) : line;

  let link = "";
  let title = head;
  if (/^https?:\/\//.test(head)) {
    const space = head.indexOf(" ");
    if (space > 0) {
      link = head.slice(0, space);
      title = head.slice(space + 1);
    } else {
      link = head;
      title = "";
    }
  }

  return (
    <div>
      {link && <span className="text-olivia-pink">{link} </span>}
      <span className="text-olivia-cream">{title}</span>
      {status && (
        <span
          className={
            status === "done" ? "text-olivia-pink-deep" : "text-olivia-muted"
          }
        >
          {" "}
          ( {status} )
        </span>
      )}
    </div>
  );
}

export function ReportModal({
  open,
  onClose,
  text,
  range,
  onRangeChange,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClose() {
    setCopied(false);
    setCopyError(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  async function copy() {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(false);
      setCopied(true);
    } catch {
      // Clipboard can be denied (permissions, non-secure context).
      setCopied(false);
      setCopyError(true);
    }
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      setCopyError(false);
    }, 2000);
  }

  const lines = text.replace(/\n$/, "").split("\n");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-olivia-border bg-olivia-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-olivia-cream">
            Current tasks report
          </h2>
          <button
            onClick={handleClose}
            className="text-olivia-muted hover:text-olivia-cream"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-1 rounded-lg border border-olivia-border bg-olivia-bg p-1 self-start">
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

        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-olivia-border bg-olivia-bg p-4 font-mono text-xs leading-relaxed">
          {loading ? (
            <span className="text-olivia-muted">Loading…</span>
          ) : text ? (
            lines.map((line, i) => <ReportLine key={i} line={line} />)
          ) : (
            <span className="text-olivia-muted">
              {range === "week"
                ? "No tasks in the last 7 days."
                : "No current tasks."}
            </span>
          )}
        </pre>

        <div className="mt-4 flex justify-end">
          <button
            onClick={copy}
            disabled={!text}
            className="rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
          >
            {copied
              ? "Copied!"
              : copyError
                ? "Copy failed — select the text manually"
                : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
