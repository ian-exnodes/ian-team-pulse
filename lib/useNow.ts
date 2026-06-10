"use client";

import { useMemo, useSyncExternalStore } from "react";

// Returns null during SSR and the hydration render, then a Date that ticks
// on the interval. Server HTML therefore never contains server-clock-derived
// content (the server tz can differ from the browser's), avoiding hydration
// mismatches, while "done today" and relative times stay fresh on an idle
// standup dashboard (incl. midnight rollover, within one interval).
export function useNow(intervalMs = 60_000): Date | null {
  const subscribe = useMemo(
    () => (onTick: () => void) => {
      const id = setInterval(onTick, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs]
  );

  // Snapshot is the interval-bucketed timestamp: stable between ticks, so
  // useSyncExternalStore doesn't loop, and pure to convert back to a Date.
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs),
    () => null
  );

  return useMemo(
    () => (tick === null ? null : new Date(tick * intervalMs)),
    [tick, intervalMs]
  );
}
