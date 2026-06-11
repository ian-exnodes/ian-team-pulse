"use client";

export function Header({
  displayName,
  avatarUrl,
  onOpenProfile,
  onOpenReport,
  notifState,
  onToggleNotifications,
}: {
  displayName: string;
  avatarUrl: string | null;
  onOpenProfile: () => void;
  onOpenReport: () => void;
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
            onClick={onOpenReport}
            className="rounded-lg bg-olivia-pink px-3 py-1.5 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
          >
            Report
          </button>
          <button
            onClick={onOpenProfile}
            title="Edit profile"
            aria-label="Edit profile"
            className="rounded-full ring-olivia-pink/60 transition hover:ring-2"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olivia-raised text-[10px] font-semibold text-olivia-pink">
                {displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]!.toUpperCase())
                  .join("")}
              </span>
            )}
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
