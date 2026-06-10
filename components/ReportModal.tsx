"use client";

import { useEffect, useRef, useState } from "react";

export function ReportModal({
  open,
  onClose,
  text,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Current tasks report
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            title="Close"
          >
            ✕
          </button>
        </div>

        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-mono text-xs text-slate-700">
          {text || "No current tasks."}
        </pre>

        <div className="mt-4 flex justify-end">
          <button
            onClick={copy}
            disabled={!text}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
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
