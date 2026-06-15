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
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { avatarPublicUrl, type PreparedAvatar } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";
import { buildReport, type ReportRange } from "@/lib/report";
import { resolveDrop, type DraggedItem } from "@/lib/dnd";
import { jiraKeyFromUrl } from "@/lib/jira";
import { isDoneToday, recentTaskCutoffIso, weekCutoffIso } from "@/lib/dates";
import {
  getNotifPermission,
  getServerNotifPermission,
  requestNotifPermission,
  showNotification,
  subscribeNotifPermission,
} from "@/lib/notifications";
import { useNow } from "@/lib/useNow";
import type { ActivityRow } from "@/lib/activity";
import type { Profile, Task, TeamItem } from "@/lib/types";
import { ActivityLog } from "./ActivityLog";
import { Header } from "./Header";
import { JiraImportModal } from "./JiraImportModal";
import { ProfileEditModal } from "./ProfileEditModal";
import { NotifPrompt } from "./NotifPrompt";
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
  initialActivity,
  currentUserId,
}: {
  initialProfiles: Profile[];
  initialTasks: Task[];
  initialTeamItems: TeamItem[];
  initialActivity: ActivityRow[];
  currentUserId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [store, dispatch] = useReducer(reducer, undefined, () => ({
    profiles: toMap(initialProfiles),
    tasks: toMap(initialTasks),
    teamItems: toMap(initialTeamItems),
    connection: "connecting" as ConnectionState,
  }));
  const [activity, setActivity] = useState<ActivityRow[]>(initialActivity);
  const [reportOpen, setReportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
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

  // Surface the result of the Jira OAuth round-trip (?jira=… on return), then
  // clean the URL so a refresh doesn't replay it.
  useEffect(() => {
    const jira = new URLSearchParams(window.location.search).get("jira");
    if (!jira) return;
    window.history.replaceState({}, "", window.location.pathname);
    const id = setTimeout(() => {
      if (jira === "connected") {
        showToast("Jira connected");
        setJiraOpen(true);
      } else if (jira === "misconfigured") {
        showToast("Jira isn't configured on the server yet");
      } else {
        showToast("Couldn't connect to Jira — try again");
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

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
        const [p, t, i, a] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase
            .from("tasks")
            .select("*")
            .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
          supabase.from("team_items").select("*"),
          supabase
            .from("activity_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
        if (p.error || t.error || i.error) {
          throw p.error ?? t.error ?? i.error;
        }
        if (myGen !== gen) return; // a newer hydrate owns the store now
        if (myGen > 1) notifyFromSnapshot(t.data, i.data);
        dispatch({
          type: "hydrate",
          profiles: p.data,
          tasks: t.data,
          teamItems: i.data,
        });
        if (a.data) setActivity(a.data as ActivityRow[]);
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
    //
    // taskStatuses tracks statuses synchronously at event arrival -
    // storeRef lags behind buffered/batched dispatches, which would cause
    // duplicate "done" notifications for rapid successive events.
    // notified dedupes across the event path and the hydrate-diff path.
    const taskStatuses = new Map<string, Task["status"]>();
    const notified = new Set<string>();
    const canNotify = () =>
      notifEnabledRef.current && document.visibilityState === "hidden";
    const notifyOnce = (key: string, title: string, body: string) => {
      if (notified.has(key)) return;
      notified.add(key);
      showNotification(title, body);
    };
    const notifyTaskDone = (task: Task) => {
      const who =
        storeRef.current.profiles[task.assignee_id]?.display_name ??
        "A teammate";
      notifyOnce(`task-done:${task.id}`, "Task done 🎉", `${who}: ${task.title}`);
    };

    const notifyAssigned = (task: Task) => {
      notifyOnce(
        `task-assigned:${task.id}`,
        "You've been assigned a task",
        task.title
      );
    };

    function maybeNotify(
      table: TableKey,
      payload: { eventType: string },
      row: RowOf[TableKey]
    ) {
      if (table === "tasks" && payload.eventType !== "DELETE") {
        const task = row as Task;
        const prev = storeRef.current.tasks[task.id];
        const prevStatus = taskStatuses.get(task.id) ?? prev?.status;
        const prevAssignee = prev?.assignee_id;
        // Record before any gating, so the map stays accurate even while
        // the tab is visible or notifications are muted.
        taskStatuses.set(task.id, task.status);
        // When a task leaves you, forget its assignment notification so a
        // later re-assignment back to you notifies again.
        if (task.assignee_id !== currentUserId) {
          notified.delete(`task-assigned:${task.id}`);
        }
        if (!canNotify()) return;
        // A teammate completed a task assigned to someone else.
        if (
          payload.eventType === "UPDATE" &&
          prevStatus !== undefined &&
          prevStatus !== "done" &&
          task.status === "done" &&
          task.assignee_id !== currentUserId
        ) {
          notifyTaskDone(task);
        }
        // Work landed on you (reassigned to you, or a todo converted onto
        // you). The visibility gate means you didn't do it yourself.
        if (task.assignee_id === currentUserId) {
          const wasMine =
            payload.eventType === "UPDATE" && prevAssignee === currentUserId;
          // created_by only suppresses your OWN insert echo (quick-add or a
          // todo you converted to yourself). On reassignment it must not
          // suppress: a task you originally created can be assigned back to
          // you by someone else, and that should notify.
          const iCreatedIt =
            payload.eventType === "INSERT" && task.created_by === currentUserId;
          if (!wasMine && !iCreatedIt) {
            notifyAssigned(task);
          }
        }
        return;
      }

      if (table === "teamItems" && payload.eventType === "INSERT") {
        const item = row as TeamItem;
        if (
          item.type === "todo" &&
          item.created_by !== currentUserId &&
          canNotify()
        ) {
          notifyOnce(`team-todo:${item.id}`, "New team todo", item.content);
        }
      }
    }

    // Transitions that happened while the socket was down never arrive as
    // events - surface them by diffing the hydrate snapshot against the
    // pre-hydrate state (storeRef still holds it; buffered events are
    // undispatched here). Skipped on the first join: the SSR snapshot is
    // fresh and the user just opened the page.
    function notifyFromSnapshot(tasks: Task[], teamItems: TeamItem[]) {
      if (canNotify()) {
        for (const task of tasks) {
          const prev = storeRef.current.tasks[task.id];
          const prevStatus = taskStatuses.get(task.id) ?? prev?.status;
          if (
            prevStatus !== "done" &&
            task.status === "done" &&
            task.assignee_id !== currentUserId
          ) {
            notifyTaskDone(task);
          }
          // Assigned to me while the socket was down. No INSERT echo here
          // (rows come from a fetch), so no created_by suppression needed -
          // you can't assign work to yourself while offline.
          if (
            task.assignee_id === currentUserId &&
            prev?.assignee_id !== currentUserId
          ) {
            notifyAssigned(task);
          }
        }
        for (const item of teamItems) {
          if (
            item.type === "todo" &&
            item.created_by !== currentUserId &&
            !storeRef.current.teamItems[item.id]
          ) {
            notifyOnce(`team-todo:${item.id}`, "New team todo", item.content);
          }
        }
      }
      for (const task of tasks) taskStatuses.set(task.id, task.status);
    }

    function makeHandler<K extends TableKey>(table: K) {
      return (payload: RealtimePostgresChangesPayload<RowOf[K]>) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) {
            if (table === "tasks") taskStatuses.delete(id);
            apply({ type: "remove", table, id });
          }
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as ActivityRow;
          setActivity((prev) =>
            prev.some((x) => x.id === row.id)
              ? prev
              : [row, ...prev].slice(0, 100)
          );
        }
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

  // Import selected Jira issues as tasks on your own card. Skips issues whose
  // browse URL is already on the board (dedup by link). Reuses the optimistic
  // insert pattern, batched into one DB write.
  async function importJiraTasks(
    issues: { summary: string; url: string }[]
  ): Promise<number> {
    // Skip issues already on the board as a task OR a team item (match by
    // the Jira key, so differing link formats still de-dupe).
    const onBoard = new Set(
      [...Object.values(store.tasks), ...Object.values(store.teamItems)]
        .map((r) => jiraKeyFromUrl(r.link))
        .filter((k): k is string => k !== null)
    );
    const fresh = issues.filter((i) => {
      const key = jiraKeyFromUrl(i.url);
      return !key || !onBoard.has(key);
    });
    if (fresh.length === 0) return 0;

    const nowIso = new Date().toISOString();
    const rows: Task[] = fresh.map((i) => ({
      id: crypto.randomUUID(),
      title: i.summary.slice(0, 200), // tasks.title CHECK caps at 200
      link: i.url,
      status: "inprogress",
      assignee_id: currentUserId,
      created_by: currentUserId,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }));
    rows.forEach((row) => dispatch({ type: "upsert", table: "tasks", row }));

    const { error } = await supabase.from("tasks").insert(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        link: r.link,
        assignee_id: currentUserId,
        created_by: currentUserId,
      }))
    );
    if (error) {
      rows.forEach((r) => dispatch({ type: "remove", table: "tasks", id: r.id }));
      showToast("Couldn't import from Jira — try again");
      return 0;
    }
    return rows.length;
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
    // .select() detects RLS-denied updates too: they "succeed" with 0 rows
    // and no error, and produce no realtime event to correct the store.
    const { data, error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: nowIso })
      .eq("id", task.id)
      .select("id");
    if (error || !data?.length) {
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

  async function reopenTask(task: Task) {
    const optimistic: Task = {
      ...task,
      status: "inprogress",
      completed_at: null,
      updated_at: new Date().toISOString(),
    };
    dispatch({ type: "upsert", table: "tasks", row: optimistic });
    const { data, error } = await supabase
      .from("tasks")
      .update({ status: "inprogress", completed_at: null })
      .eq("id", task.id)
      .select("id");
    if (error || !data?.length) {
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
    const { data, error } = await supabase
      .from("profiles")
      .update({ manual_status: next })
      .eq("id", profile.id)
      .select("id");
    if (error || !data?.length) {
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

  // Upload first (fixed path, upsert), then write the row. If the row
  // write fails after an upload, the old row is restored; the storage
  // object was already replaced, which the next successful save corrects.
  async function saveProfile(
    displayName: string,
    avatar: PreparedAvatar | null,
    nameColor: string | null
  ) {
    const profile = store.profiles[currentUserId];
    if (!profile) return;
    setProfileSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatar) {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(currentUserId, avatar.blob, {
            upsert: true,
            contentType: avatar.contentType,
          });
        if (error) {
          showToast("Couldn't upload the image — try again");
          return;
        }
        avatarUrl = avatarPublicUrl(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          currentUserId,
          Date.now()
        );
      }

      const optimistic: Profile = {
        ...profile,
        display_name: displayName,
        avatar_url: avatarUrl,
        name_color: nameColor,
      };
      dispatch({ type: "upsert", table: "profiles", row: optimistic });
      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl, name_color: nameColor })
        .eq("id", currentUserId)
        .select("id");
      if (error || !data?.length) {
        dispatch({
          type: "rollback",
          table: "profiles",
          id: currentUserId,
          ifCurrentIs: optimistic,
          row: profile,
        });
        showToast("Couldn't save profile");
        return;
      }
      setProfileOpen(false);
    } finally {
      setProfileSaving(false);
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

  // Ticking a blocker means it's resolved into actionable work: it leaves
  // the TBD list and reappears in the Team Todolist (undone).
  async function resolveTbdToTodo(item: TeamItem) {
    const optimistic: TeamItem = { ...item, type: "todo", done: false };
    dispatch({ type: "upsert", table: "teamItems", row: optimistic });
    const { data, error } = await supabase
      .from("team_items")
      .update({ type: "todo", done: false })
      .eq("id", item.id)
      .select("id");
    if (error || !data?.length) {
      dispatch({
        type: "rollback",
        table: "teamItems",
        id: item.id,
        ifCurrentIs: optimistic,
        row: item,
      });
      showToast("Couldn't move blocker to todolist");
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

  // --- Drag-to-assign mutations. ---

  async function reassignTask(task: Task, to: string) {
    const optimistic: Task = {
      ...task,
      assignee_id: to,
      updated_at: new Date().toISOString(),
    };
    dispatch({ type: "upsert", table: "tasks", row: optimistic });
    const { data, error } = await supabase
      .from("tasks")
      .update({ assignee_id: to })
      .eq("id", task.id)
      .select("id");
    if (error || !data?.length) {
      dispatch({
        type: "rollback",
        table: "tasks",
        id: task.id,
        ifCurrentIs: optimistic,
        row: task,
      });
      showToast("Couldn't reassign task");
    }
  }

  // Move a shared todo onto a member: insert a task, then drop the todo.
  // Insert first so a failure never loses the todo; the brief window where
  // both exist is recoverable (the todo can be dismissed).
  async function convertTodoToTask(item: TeamItem, to: string) {
    const taskId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const newTask: Task = {
      id: taskId,
      title: item.content.slice(0, 200), // tasks.title CHECK caps at 200
      link: item.link,
      status: "inprogress",
      assignee_id: to,
      created_by: currentUserId,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    dispatch({ type: "upsert", table: "tasks", row: newTask });
    dispatch({ type: "remove", table: "teamItems", id: item.id });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: taskId,
        title: newTask.title,
        link: newTask.link,
        assignee_id: to,
        created_by: currentUserId,
      })
      .select("id");
    if (error || !data?.length) {
      // Nothing was assigned: drop the optimistic task and restore the todo,
      // but only if nothing else (a realtime event) has touched the slot.
      dispatch({ type: "remove", table: "tasks", id: taskId });
      dispatch({
        type: "rollback",
        table: "teamItems",
        id: item.id,
        ifCurrentIs: undefined,
        row: item,
      });
      showToast("Couldn't assign todo — try again");
      return;
    }

    const { error: delError } = await supabase
      .from("team_items")
      .delete()
      .eq("id", item.id);
    if (delError) {
      // The task was created but the todo couldn't be removed. Leave it
      // removed locally (so it can't be re-dragged into a duplicate task);
      // it still exists in the DB and the next reconnect-hydrate re-surfaces
      // it for manual dismissal.
      showToast("Assigned — the leftover todo will reappear on refresh");
    }
  }

  // --- Derived views. ---

  // Your own card always leads; everyone else follows alphabetically.
  const profiles = useMemo(
    () =>
      Object.values(store.profiles).sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.display_name.localeCompare(b.display_name);
      }),
    [store.profiles, currentUserId]
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

  // --- Report. ---
  // The store only holds ~48h of tasks, so the week range fetches its own
  // snapshot when selected (refreshed each time the modal opens).
  const [reportRange, setReportRange] = useState<ReportRange>("day");
  const [weekTasks, setWeekTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!reportOpen || reportRange !== "week" || weekTasks) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`status.eq.inprogress,completed_at.gte.${weekCutoffIso(new Date())}`);
      if (cancelled) return;
      if (error || !data) {
        showToast("Couldn't load this week's tasks");
        setReportRange("day");
        return;
      }
      setWeekTasks(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportOpen, reportRange, weekTasks, supabase]);

  const reportLoading = reportRange === "week" && weekTasks === null;

  // now is null until mounted; the modal opens only after a click, so the
  // report is always built by then.
  const reportText = useMemo(() => {
    if (!now) return "";
    if (reportRange === "week") {
      return weekTasks ? buildReport(weekTasks, now, "week") : "";
    }
    return buildReport(Object.values(store.tasks), now, "day");
  }, [store.tasks, now, reportRange, weekTasks]);

  const currentProfile = store.profiles[currentUserId];

  // Jira keys already on the board (as tasks or team items) - used to mark
  // search results that are already imported.
  const existingJiraKeys = useMemo(
    () =>
      new Set(
        [...Object.values(store.tasks), ...Object.values(store.teamItems)]
          .map((r) => jiraKeyFromUrl(r.link))
          .filter((k): k is string => k !== null)
      ),
    [store.tasks, store.teamItems]
  );

  // Jira import is off by default; enable per-environment with
  // NEXT_PUBLIC_JIRA_ENABLED=true (kept local until we decide on it).
  const jiraEnabled = process.env.NEXT_PUBLIC_JIRA_ENABLED === "true";

  // --- Drag and drop. ---
  // Distance constraint so a click on the handle isn't read as a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DraggedItem | undefined;
    if (!data) return;
    setDragLabel(
      data.kind === "task"
        ? store.tasks[data.id]?.title ?? "task"
        : store.teamItems[data.id]?.content ?? "todo"
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragLabel(null);
    const data = event.active.data.current as DraggedItem | undefined;
    const targetId = event.over?.id;
    if (!data || typeof targetId !== "string") return;

    const action = resolveDrop(data, targetId);
    if (!action) return;
    if (action.type === "reassign") {
      const task = store.tasks[action.taskId];
      if (task) void reassignTask(task, action.to);
    } else {
      const item = store.teamItems[action.itemId];
      if (item) void convertTodoToTask(item, action.to);
    }
  }

  return (
    <DndContext
      id="team-pulse-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragLabel(null)}
    >
    <div className="min-h-screen bg-olivia-bg">
      <Header
        displayName={currentProfile?.display_name ?? "…"}
        avatarUrl={currentProfile?.avatar_url ?? null}
        onOpenProfile={() => setProfileOpen(true)}
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

      <NotifPrompt
        show={notifPerm === "default"}
        onEnable={() => {
          void requestNotifPermission();
          setNotifMuted(false);
        }}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <section className="grid flex-1 content-start gap-5 sm:grid-cols-2">
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
                            t.status === "done" &&
                            isDoneToday(t.completed_at, now)
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
                onReopen={reopenTask}
                onToggleOff={() => toggleOff(profile)}
              />
            );
          })}
        </section>

        <aside className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
          {jiraEnabled && (
            <button
              onClick={() => setJiraOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-olivia-border bg-olivia-bg/40 px-4 py-2.5 text-sm font-medium text-olivia-cream hover:bg-olivia-raised"
            >
              <span className="text-olivia-pink">＋</span> Import from Jira
            </button>
          )}
          <TeamTodoList
            items={todoItems}
            onAdd={(content, link) => addTeamItem("todo", content, link)}
            onDelete={dismissTeamItem}
          />
          <TbdList
            items={tbdItems}
            profiles={store.profiles}
            now={now}
            onAdd={(content, link) => addTeamItem("tbd", content, link)}
            onToggle={resolveTbdToTodo}
            onDismiss={dismissTeamItem}
          />
        </aside>
      </main>

      <ActivityLog
        activity={activity}
        currentUserId={currentUserId}
        profiles={store.profiles}
        now={now}
      />

      <ReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setWeekTasks(null); // refetch next open so the week view is fresh
        }}
        text={reportText}
        range={reportRange}
        onRangeChange={setReportRange}
        loading={reportLoading}
      />
      {profileOpen && currentProfile && (
        <ProfileEditModal
          profile={currentProfile}
          saving={profileSaving}
          showJira={jiraEnabled}
          onClose={() => setProfileOpen(false)}
          onSave={(displayName, avatar, nameColor) =>
            void saveProfile(displayName, avatar, nameColor)
          }
        />
      )}
      {jiraEnabled && jiraOpen && (
      <JiraImportModal
        onClose={() => setJiraOpen(false)}
        existingKeys={existingJiraKeys}
        onImport={async (issues) => {
          const n = await importJiraTasks(issues);
          if (n > 0) showToast(`Imported ${n} ${n === 1 ? "task" : "tasks"} from Jira`);
          return n;
        }}
      />
      )}
      <Toast message={toast} />

      {store.connection === "reconnecting" && (
        <div className="fixed bottom-4 left-4 rounded-full border border-olivia-border bg-olivia-raised px-3 py-1 text-xs font-medium text-olivia-pink shadow">
          Reconnecting…
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {dragLabel ? (
          <div className="max-w-xs truncate rounded-lg border border-olivia-pink bg-olivia-raised px-3 py-1.5 text-sm text-olivia-cream shadow-lg">
            {dragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
