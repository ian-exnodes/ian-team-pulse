"use client";

export function Header({
  displayName,
  onOpenReport,
  onOpenJira,
  notifState,
  onToggleNotifications,
}: {
  displayName: string;
  onOpenReport: () => void;
  onOpenJira: () => void;
  notifState: "on" | "off" | "hidden";
  onToggleNotifications: () => void;
}) {
  return (
    <header className="border-b border-olivia-border bg-olivia-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-olivia-cream">
          Team Pulse<span className="text-olivia-pink">.</span>
        </h1>
        <div className="flex items-center gap-3">
          {notifState !== "hidden" && (
            <button
              onClick={onToggleNotifications}
              title={
                notifState === "on"
                  ? "Notifications on — click to mute"
                  : "Enable browser notifications (done tasks, new team todos)"
              }
              className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                notifState === "on"
                  ? "border-olivia-pink/60 text-olivia-pink"
                  : "border-olivia-border text-olivia-muted hover:text-olivia-cream"
              }`}
            >
              {notifState === "on" ? "🔔" : "🔕"}
            </button>
          )}
          <button
            onClick={onOpenJira}
            title="Import issues from Jira"
            className="rounded-lg border border-olivia-border px-3 py-1.5 text-sm text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
          >
            Jira
          </button>
          <button
            onClick={onOpenReport}
            className="rounded-lg bg-olivia-pink px-3 py-1.5 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
          >
            Report
          </button>
          <span className="hidden text-sm text-olivia-muted sm:inline">
            {displayName}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-olivia-border px-3 py-1.5 text-sm text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
