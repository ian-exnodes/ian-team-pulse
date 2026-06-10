"use client";

export function Header({
  displayName,
  onOpenReport,
}: {
  displayName: string;
  onOpenReport: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900">Team Pulse</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenReport}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Report
          </button>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {displayName}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
