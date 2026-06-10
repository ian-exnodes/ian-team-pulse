"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { buildReport } from "@/lib/report";
import { isToday, recentTaskCutoffIso } from "@/lib/dates";
import {
  getNotifPermission,
  getServerNotifPermission,
  requestNotifPermission,
  showNotification,
  subscribeNotifPermission,
} from "@/lib/notifications";
import { useNow } from "@/lib/useNow";
import type { Profile, Task, TeamItem } from "@/lib/types";
import { Header } from "./Header";
import { ProfileCard } from "./ProfileCard";
import { ReportModal } from "./ReportModal";
import { TbdList } from "./TbdList";
import { TeamTodoList } from "./TeamTodoList";
import { Toast } from "./Toast";

type RowOf = { profiles: Profile; tasks: Task; teamItems: TeamItem };
type TableKey = keyof RowOf;
type ConnectionState = "connecting" | "live" | "reconnecting";

type Store = {
  profiles: Record<string, Profile>;
  tasks: Record<string, Task>;
  teamItems: Record<string, TeamItem>;
  connection: ConnectionState;
};

type Action =
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

function toMap<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

function reducer(store: Store, action: Action): Store {
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

export function Dashboard({
  initialProfiles,
  initialTasks,
  initialTeamItems,
  currentUserId,
}: {
  initialProfiles: Profile[];
  initialTasks: Task[];
  initialTeamItems: TeamItem[];
  currentUserId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [store, dispatch] = useReducer(reducer, undefined, () => ({
    profiles: toMap(initialProfiles),
    tasks: toMap(initialTasks),
    teamItems: toMap(initialTeamItems),
    connection: "connecting" as ConnectionState,
  }));
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useNow();

  // Mirror of the store for realtime handlers (they outlive renders).
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  // --- Browser notifications. ---
  const notifPerm = useSyncExternalStore(
    subscribeNotifPermission,
    getNotifPermission,
    getServerNotifPermission
  );
  const [notifMuted, setNotifMuted] = useState(false);
  const notifEnabled = notifPerm === "granted" && !notifMuted;
  const notifEnabledRef = useRef(notifEnabled);
  useEffect(() => {
    notifEnabledRef.current = notifEnabled;
  }, [notifEnabled]);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function toggleNotifications() {
    if (notifPerm === "ssr") return;
    if (notifPerm === "unsupported") {
      showToast("This browser doesn't support notifications");
      return;
    }
    if (notifPerm === "default") {
      void requestNotifPermission();
      setNotifMuted(false);
      return;
    }
    if (notifPerm === "denied") {
      showToast("Notifications are blocked in your browser settings");
      return;
    }
    setNotifMuted((m) => !m);
  }

  // --- Realtime: one channel, three table bindings, upsert-by-id deltas. ---
  useEffect(() => {
    // While a hydrate fetch is in flight, buffer events and replay them after
    // the wholesale replace, or rows changed mid-fetch are silently lost.
    let buffering = false;
    let buffer: Action[] = [];
    // Rapid reconnects can overlap hydrates; only the newest may dispatch its
    // snapshot or release the buffer, or events fetched around a stale
    // hydrate get wholesale-replaced away.
    let gen = 0;
    const apply = (action: Action) => {
      if (buffering) buffer.push(action);
      else dispatch(action);
    };

    async function hydrate() {
      const myGen = ++gen;
      buffering = true;
      buffer = []; // safe: discarded events predate the new fetch's snapshot
      try {
        const cutoff = recentTaskCutoffIso();
        const [p, t, i] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase
            .from("tasks")
            .select("*")
            .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
          supabase.from("team_items").select("*"),
        ]);
        if (p.error || t.error || i.error) {
          throw p.error ?? t.error ?? i.error;
        }
        if (myGen !== gen) return; // a newer hydrate owns the store now
        dispatch({
          type: "hydrate",
          profiles: p.data,
          tasks: t.data,
          teamItems: i.data,
        });
        dispatch({ type: "connection", value: "live" });
      } catch {
        // Keep current state; events still apply and the next rejoin retries.
      } finally {
        if (myGen === gen) {
          buffering = false;
          buffer.forEach(dispatch);
          buffer = [];
        }
      }
    }

    // Notifications for teammates' activity. Skips your own actions and
    // fires only when the tab is in the background (the dashboard already
    // shows changes live when you're looking at it).
    function maybeNotify(table: TableKey, payload: { eventType: string }, row: RowOf[TableKey]) {
      if (!notifEnabledRef.current) return;
      if (document.visibilityState === "visible") return;

      if (table === "tasks" && payload.eventType === "UPDATE") {
        const task = row as Task;
        const prev = storeRef.current.tasks[task.id];
        if (
          prev &&
          prev.status !== "done" &&
          task.status === "done" &&
          task.assignee_id !== currentUserId
        ) {
          const who =
            storeRef.current.profiles[task.assignee_id]?.display_name ??
            "A teammate";
          showNotification("Task done 🎉", `${who}: ${task.title}`);
        }
      }

      if (table === "teamItems" && payload.eventType === "INSERT") {
        const item = row as TeamItem;
        if (item.type === "todo" && item.created_by !== currentUserId) {
          showNotification("New team todo", item.content);
        }
      }
    }

    function makeHandler<K extends TableKey>(table: K) {
      return (payload: RealtimePostgresChangesPayload<RowOf[K]>) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) apply({ type: "remove", table, id });
        } else {
          maybeNotify(table, payload, payload.new);
          apply({ type: "upsert", table, row: payload.new });
        }
      };
    }

    const channel = supabase
      .channel("team-pulse")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        makeHandler("profiles")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        makeHandler("tasks")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_items" },
        makeHandler("teamItems")
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Hydrate on every (re)join to backfill anything missed.
          void hydrate();
        } else {
          dispatch({ type: "connection", value: "reconnecting" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId]);

  // --- Optimistic mutations: client-generated UUIDs, rollback on error. ---

  async function addTask(title: string, link: string) {
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const row: Task = {
      id,
      title,
      link: link.trim() || null,
      status: "inprogress",
      assignee_id: currentUserId,
      created_by: currentUserId,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    dispatch({ type: "upsert", table: "tasks", row });
    const { error } = await supabase.from("tasks").insert({
      id,
      title,
      link: row.link,
      assignee_id: currentUserId,
      created_by: currentUserId,
    });
    if (error) {
      dispatch({ type: "remove", table: "tasks", id });
      showToast("Couldn't add task — try again");
    }
  }

  async function markTaskDone(task: Task) {
    const nowIso = new Date().toISOString();
    const optimistic: Task = {
      ...task,
      status: "done",
      completed_at: nowIso,
      updated_at: nowIso,
    };
    dispatch({ type: "upsert", table: "tasks", row: optimistic });
    const { error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: nowIso })
      .eq("id", task.id);
    if (error) {
      dispatch({
        type: "rollback",
        table: "tasks",
        id: task.id,
        ifCurrentIs: optimistic,
        row: task,
      });
      showToast("Couldn't save change");
    }
  }

  async function toggleOff(profile: Profile) {
    const next = profile.manual_status === "off" ? null : ("off" as const);
    const optimistic: Profile = { ...profile, manual_status: next };
    dispatch({ type: "upsert", table: "profiles", row: optimistic });
    const { error } = await supabase
      .from("profiles")
      .update({ manual_status: next })
      .eq("id", profile.id);
    if (error) {
      dispatch({
        type: "rollback",
        table: "profiles",
        id: profile.id,
        ifCurrentIs: optimistic,
        row: profile,
      });
      showToast("Couldn't save change");
    }
  }

  async function addTeamItem(type: TeamItem["type"], content: string, link: string) {
    const id = crypto.randomUUID();
    const row: TeamItem = {
      id,
      type,
      content,
      link: link.trim() || null,
      done: false,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: "upsert", table: "teamItems", row });
    const { error } = await supabase.from("team_items").insert({
      id,
      type,
      content,
      link: row.link,
      created_by: currentUserId,
    });
    if (error) {
      dispatch({ type: "remove", table: "teamItems", id });
      showToast("Couldn't add item — try again");
    }
  }

  async function toggleTeamItem(item: TeamItem) {
    const optimistic: TeamItem = { ...item, done: !item.done };
    dispatch({ type: "upsert", table: "teamItems", row: optimistic });
    const { error } = await supabase
      .from("team_items")
      .update({ done: !item.done })
      .eq("id", item.id);
    if (error) {
      dispatch({
        type: "rollback",
        table: "teamItems",
        id: item.id,
        ifCurrentIs: optimistic,
        row: item,
      });
      showToast("Couldn't save change");
    }
  }

  async function dismissTeamItem(item: TeamItem) {
    dispatch({ type: "remove", table: "teamItems", id: item.id });
    const { error } = await supabase
      .from("team_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      // Restore only if nothing (e.g. a realtime event) re-added the row.
      dispatch({
        type: "rollback",
        table: "teamItems",
        id: item.id,
        ifCurrentIs: undefined,
        row: item,
      });
      showToast("Couldn't dismiss item");
    }
  }

  // --- Derived views. ---

  const profiles = useMemo(
    () =>
      Object.values(store.profiles).sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      ),
    [store.profiles]
  );

  const tasksByAssignee = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of Object.values(store.tasks)) {
      (map[t.assignee_id] ??= []).push(t);
    }
    return map;
  }, [store.tasks]);

  const todoItems = useMemo(
    () =>
      Object.values(store.teamItems)
        .filter((i) => i.type === "todo")
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [store.teamItems]
  );

  const tbdItems = useMemo(
    () =>
      Object.values(store.teamItems)
        .filter((i) => i.type === "tbd")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [store.teamItems]
  );

  // now is null until mounted; the modal opens only after a click, so the
  // report is always built by then.
  const reportText = useMemo(
    () => (now ? buildReport(Object.values(store.tasks), now) : ""),
    [store.tasks, now]
  );

  const currentProfile = store.profiles[currentUserId];

  return (
    <div className="min-h-screen bg-olivia-bg">
      <Header
        displayName={currentProfile?.display_name ?? "…"}
        onOpenReport={() => setReportOpen(true)}
        notifState={
          notifPerm === "ssr" || notifPerm === "unsupported"
            ? "hidden"
            : notifEnabled
              ? "on"
              : "off"
        }
        onToggleNotifications={toggleNotifications}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <section className="grid flex-1 content-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => {
            const memberTasks = tasksByAssignee[profile.id] ?? [];
            return (
              <ProfileCard
                key={profile.id}
                profile={profile}
                tasks={memberTasks}
                doneTodayTasks={
                  now
                    ? memberTasks
                        .filter(
                          (t) =>
                            t.status === "done" && isToday(t.completed_at, now)
                        )
                        .sort((a, b) =>
                          (a.completed_at ?? "").localeCompare(
                            b.completed_at ?? ""
                          )
                        )
                    : []
                }
                isCurrentUser={profile.id === currentUserId}
                onAddTask={addTask}
                onMarkDone={markTaskDone}
                onToggleOff={() => toggleOff(profile)}
              />
            );
          })}
        </section>

        <aside className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
          <TeamTodoList
            items={todoItems}
            onAdd={(content, link) => addTeamItem("todo", content, link)}
            onToggle={toggleTeamItem}
          />
          <TbdList
            items={tbdItems}
            profiles={store.profiles}
            now={now}
            onAdd={(content, link) => addTeamItem("tbd", content, link)}
            onToggle={toggleTeamItem}
            onDismiss={dismissTeamItem}
          />
        </aside>
      </main>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        text={reportText}
      />
      <Toast message={toast} />

      {store.connection === "reconnecting" && (
        <div className="fixed bottom-4 left-4 rounded-full border border-olivia-border bg-olivia-raised px-3 py-1 text-xs font-medium text-olivia-pink shadow">
          Reconnecting…
        </div>
      )}
    </div>
  );
}
