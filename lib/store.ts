// The Dashboard's client-side store: a normalized snapshot of the three
// realtime tables plus the connection state. Kept as a pure reducer (no React)
// so the optimistic-update and rollback logic can be unit-tested directly.

import type { Profile, Task, TeamItem } from "./types";

export type RowOf = { profiles: Profile; tasks: Task; teamItems: TeamItem };
export type TableKey = keyof RowOf;
export type ConnectionState = "connecting" | "live" | "reconnecting";

export type Store = {
  profiles: Record<string, Profile>;
  tasks: Record<string, Task>;
  teamItems: Record<string, TeamItem>;
  connection: ConnectionState;
};

export type Action =
  | { type: "hydrate"; profiles: Profile[]; tasks: Task[]; teamItems: TeamItem[] }
  | { type: "upsert"; table: TableKey; row: RowOf[TableKey] }
  | { type: "remove"; table: TableKey; id: string }
  | {
      // Restore `row` only if the store still holds the exact optimistic row
      // (`ifCurrentIs`) - a fresher realtime row must not be clobbered.
      type: "rollback";
      table: TableKey;
      id: string;
      ifCurrentIs: RowOf[TableKey] | undefined;
      row: RowOf[TableKey];
    }
  | { type: "connection"; value: ConnectionState };

export function toMap<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

export function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case "hydrate":
      return {
        ...store,
        profiles: toMap(action.profiles),
        tasks: toMap(action.tasks),
        teamItems: toMap(action.teamItems),
      };
    case "upsert":
      return {
        ...store,
        [action.table]: { ...store[action.table], [action.row.id]: action.row },
      };
    case "remove": {
      const next = { ...store[action.table] };
      delete next[action.id];
      return { ...store, [action.table]: next };
    }
    case "rollback": {
      if (store[action.table][action.id] !== action.ifCurrentIs) return store;
      return {
        ...store,
        [action.table]: { ...store[action.table], [action.id]: action.row },
      };
    }
    case "connection":
      return { ...store, connection: action.value };
  }
}
