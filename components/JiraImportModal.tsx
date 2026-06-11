"use client";

import { useCallback, useEffect, useState } from "react";

interface JiraIssue {
  key: string;
  summary: string;
  url: string;
  status: string | null;
}

type Load =
  | { state: "loading" }
  | { state: "disconnected" }
  | { state: "connected"; issues: JiraIssue[] }
  | { state: "error" };

export function JiraImportModal({
  open,
  onClose,
  existingLinks,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  existingLinks: Set<string>;
  onImport: (issues: JiraIssue[]) => Promise<number>;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoad({ state: "loading" });
    setSelected(new Set());
    try {
      const res = await fetch("/api/jira/issues");
      if (!res.ok) {
        setLoad({ state: "error" });
        return;
      }
      const data = await res.json();
      setLoad(
        data.connected
          ? { state: "connected", issues: data.issues as JiraIssue[] }
          : { state: "disconnected" }
      );
    } catch {
      setLoad({ state: "error" });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Deferred so the synchronous "loading" state isn't set in the effect body.
    const id = setTimeout(() => void fetchIssues(), 0);
    return () => clearTimeout(id);
  }, [open, fetchIssues]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function disconnect() {
    await fetch("/api/jira/disconnect", { method: "POST" });
    setLoad({ state: "disconnected" });
  }

  async function doImport() {
    if (load.state !== "connected") return;
    const chosen = load.issues.filter((i) => selected.has(i.url));
    if (chosen.length === 0) return;
    setImporting(true);
    await onImport(chosen);
    setImporting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-olivia-border bg-olivia-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-olivia-cream">
            Import from Jira
          </h2>
          <button
            onClick={onClose}
            className="text-olivia-muted hover:text-olivia-cream"
            title="Close"
          >
            ✕
          </button>
        </div>

        {load.state === "loading" && (
          <p className="text-sm text-olivia-muted">Loading…</p>
        )}

        {load.state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Couldn&apos;t reach Jira. Try reconnecting.
            </p>
            <a
              href="/api/jira/connect"
              className="inline-block rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
            >
              Connect Jira
            </a>
          </div>
        )}

        {load.state === "disconnected" && (
          <div className="space-y-3">
            <p className="text-sm text-olivia-muted">
              Connect your Jira account to pull your open issues onto the board.
            </p>
            <a
              href="/api/jira/connect"
              className="inline-block rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
            >
              Connect Jira
            </a>
          </div>
        )}

        {load.state === "connected" && (
          <>
            {load.issues.length === 0 ? (
              <p className="text-sm text-olivia-muted">
                No open issues assigned to you in Jira.
              </p>
            ) : (
              <ul className="flex-1 space-y-1.5 overflow-auto">
                {load.issues.map((issue) => {
                  const already = existingLinks.has(issue.url);
                  return (
                    <li key={issue.key}>
                      <label
                        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          already
                            ? "opacity-50"
                            : "cursor-pointer hover:bg-olivia-raised"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={already}
                          checked={already || selected.has(issue.url)}
                          onChange={() => toggle(issue.url)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-status-active"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-mono text-xs text-olivia-pink">
                            {issue.key}
                          </span>{" "}
                          <span className="text-olivia-cream">
                            {issue.summary}
                          </span>
                          {already && (
                            <span className="ml-1 text-xs text-olivia-muted">
                              (on board)
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={disconnect}
                className="text-xs text-olivia-muted underline-offset-2 hover:text-olivia-cream hover:underline"
              >
                Disconnect Jira
              </button>
              <button
                onClick={doImport}
                disabled={importing || selected.size === 0}
                className="rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${selected.size || ""}`.trim()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
