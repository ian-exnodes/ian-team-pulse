"use client";

import { useCallback, useEffect, useState } from "react";

interface JiraIssue {
  key: string;
  summary: string;
  url: string;
  status: string | null;
  assignee: string | null;
}

type Conn = "loading" | "disconnected" | "connected" | "error";

// Mounted by the parent only while open. Lets you search your Jira (statuses
// To Do / Ready / Blocked / In Progress, optional keyword) and import picks
// onto your card. Tokens stay server-side; only the issue list comes back.
export function JiraImportModal({
  onClose,
  existingKeys,
  onImport,
}: {
  onClose: () => void;
  // Jira keys already on the board (tasks or team items) - shown as imported.
  existingKeys: Set<string>;
  onImport: (issues: JiraIssue[]) => Promise<number>;
}) {
  const [conn, setConn] = useState<Conn>("loading");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Resolve connection state on open WITHOUT searching - the Jira search only
  // runs once the user actually types a keyword.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/jira/status");
        const data = await res.json();
        if (active) setConn(data.connected ? "connected" : "disconnected");
      } catch {
        if (active) setConn("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearchFailed(false);
    try {
      const res = await fetch(`/api/jira/issues?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setConn("error");
        return;
      }
      const data = await res.json();
      if (!data.connected) {
        setConn("disconnected");
        return;
      }
      setIssues((data.issues ?? []) as JiraIssue[]);
      setSearchFailed(Boolean(data.error));
    } catch {
      setConn("error");
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search - only fires when there's a keyword.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const id = setTimeout(() => void runSearch(q), 350);
    return () => clearTimeout(id);
  }, [query, runSearch]);

  // `searching` is set on keystroke (below) so the spinner shows during the
  // debounce window, not just after the request starts.
  function onQueryChange(value: string) {
    setQuery(value);
    setSearching(value.trim().length > 0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function doImport() {
    const chosen = issues.filter((i) => selected.has(i.url));
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

        {conn === "loading" && (
          <p className="text-sm text-olivia-muted">Loading…</p>
        )}

        {(conn === "error" || conn === "disconnected") && (
          <div className="space-y-3">
            <p className="text-sm text-olivia-muted">
              {conn === "error"
                ? "Couldn't reach Jira. Try reconnecting."
                : "Connect your Jira account to search and import issues."}
            </p>
            <a
              href="/api/jira/connect"
              className="inline-block rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
            >
              Connect Jira
            </a>
          </div>
        )}

        {conn === "connected" && (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search issues by keyword…"
              className="mb-1 w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
            />
            <p className="mb-3 text-xs text-olivia-muted">
              Searches all statuses · newest first
            </p>

            <div className="olivia-scroll -mr-3 flex-1 overflow-y-auto pr-3">
              {query.trim() === "" ? (
                <p className="text-sm text-olivia-muted">
                  Type a keyword to search your Jira issues.
                </p>
              ) : searching ? (
                <p className="text-sm text-olivia-muted">Searching…</p>
              ) : searchFailed ? (
                <p className="text-sm text-red-300">
                  Couldn&apos;t search Jira. Try again in a moment.
                </p>
              ) : issues.length === 0 ? (
                <p className="text-sm text-olivia-muted">No matching issues.</p>
              ) : (
                <ul className="space-y-1.5">
                  {issues.map((issue) => {
                    const already = existingKeys.has(issue.key);
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
                            <span>
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
                            <span className="mt-0.5 block text-xs text-olivia-muted">
                              {issue.status ?? "—"} ·{" "}
                              <span className="font-medium text-olivia-pink">
                                {issue.assignee ?? "Unassigned"}
                              </span>
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end">
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
