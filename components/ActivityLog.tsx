"use client";

import { renderActivity, type ActivityRow } from "@/lib/activity";
import { relativeTime } from "@/lib/dates";

// Full-width feed below the board. Member names are highlighted; the current
// user renders as "You" in pink. Newest first.
export function ActivityLog({
  activity,
  currentUserId,
  namesById,
  now,
}: {
  activity: ActivityRow[];
  currentUserId: string;
  namesById: Record<string, string>;
  now: Date | null;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
        <span className="inline-block h-2 w-2 rounded-full bg-status-active" />
        Activity
      </h2>

      {activity.length === 0 ? (
        <p className="text-sm text-olivia-muted/70">No activity yet.</p>
      ) : (
        <ul className="olivia-scroll max-h-96 space-y-0.5 overflow-y-auto pr-2">
          {activity.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-4 rounded-lg px-2 py-1.5 text-sm hover:bg-olivia-surface/60"
            >
              <span className="min-w-0 text-olivia-cream/90">
                {renderActivity(entry, currentUserId, namesById).map((seg, i) => {
                  if (seg.kind === "name") {
                    return (
                      <span
                        key={i}
                        className={
                          seg.isYou
                            ? "font-semibold text-olivia-pink"
                            : "font-semibold text-olivia-cream"
                        }
                      >
                        {seg.value}
                      </span>
                    );
                  }
                  if (seg.kind === "detail") {
                    return (
                      <span key={i} className="text-olivia-muted">
                        {seg.value}
                      </span>
                    );
                  }
                  return <span key={i}>{seg.value}</span>;
                })}
              </span>
              {now && (
                <time
                  dateTime={entry.created_at}
                  title={new Date(entry.created_at).toLocaleString()}
                  className="shrink-0 whitespace-nowrap text-xs text-olivia-muted"
                >
                  {relativeTime(entry.created_at, now)}
                </time>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
