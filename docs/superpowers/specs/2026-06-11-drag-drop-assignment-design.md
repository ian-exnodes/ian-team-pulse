# Drag-and-drop task assignment — design

## Context

Team Pulse currently enforces per-user isolation (migrations 0002/0003): only a
task's assignee can change it, only you can set your own status. The team wants
to **assign work by dragging** — drag a task from one member's card to another
to reassign it, or drag a shared Team Todolist item onto a member to make it
their task. They also want the assignee to be **notified** when work lands on
them. This deliberately relaxes the task-isolation rule (user-approved:
"open assignment"); profile status stays personal.

## Decisions (user-approved)

- **Open assignment**: any authenticated user can assign/reassign any task to
  anyone. `profiles.manual_status` stays owner-only; `team_items` attribution
  stays pinned.
- **Draggable**: in-progress tasks (between member cards) and not-done Team
  Todolist items (onto a member). **Not** TBD blockers, not done tasks.
- **Mark-done stays own-card-only in the UI** — drag is the one deliberate
  cross-person gesture; "done" still means "I finished my work" (the DB now
  permits anyone, so this is a UX choice, easily flipped).
- **Assignment notifications**: when a task becomes yours via someone else's
  action, you get a browser notification (subject to the existing
  background-tab + bell-enabled gate).

## Data model / permissions

- **Migration `0004_open_task_assignment.sql`**: drop the owner-only task
  policies from 0002; restore permissive `tasks` policies (any authenticated
  user full CRUD) + grants. `profiles` and `team_items` policies unchanged.
- No schema changes. Reassign = `update tasks set assignee_id`. Todo→task =
  insert `tasks` + delete `team_items` (a move).
- The 0-row-update rollback added last session keeps working (permissive
  policies mean legitimate updates return rows).

## UI / interaction

- **`@dnd-kit/core`** (+ `@dnd-kit/utilities`): pointer + touch + keyboard
  accessible. `DndContext` wraps the dashboard main+aside region.
- **Drag handle** (grip glyph) on each draggable row — avoids click-vs-drag
  ambiguity with the existing mark-done button and link icon.
- **Drop targets**: each `ProfileCard` is a droppable keyed by profile id;
  highlights (pink ring) on drag-over. `DragOverlay` shows a small chip.
- Dragging onto the card a task already belongs to is a no-op.

## Logic

- **`lib/dnd.ts`** — pure `resolveDrop(dragged, targetProfileId)` returning a
  descriptor (`{kind:'reassign', taskId, to}` | `{kind:'convert', itemId, to}` |
  `null`). Unit-tested in isolation; keeps the DnD wiring thin.
- **`reassignTask(task, to)`**: optimistic upsert (assignee_id=to) →
  `update().eq().select("id")` → rollback on error/0-rows.
- **`convertTodoToTask(item, to)`**: optimistic remove team_item + insert task
  (title = `content.slice(0,200)` to respect the title CHECK, link carried
  over, status inprogress, assignee=to, created_by=me). DB order: **insert
  first** (confirm via select), then delete team_item. Insert fails → restore
  todo, drop optimistic task, toast. Delete fails → keep task, restore todo to
  store (honest state), toast; user can dismiss the lingering todo.

## Notifications

In the realtime handler + hydrate-snapshot diff (both already exist):

- task **UPDATE** where `prev.assignee_id !== me && new.assignee_id === me` →
  "You've been assigned a task: {title}".
- task **INSERT** where `assignee_id === me && created_by !== me` (todo→task
  conversion onto me) → same notification.
- Self-assignment doesn't notify: the existing `visibilityState === "hidden"`
  gate means you can't be dragging (tab visible) and notified at once. Deduped
  via the existing `notified` set, key `task-assigned:${id}`.

## Out of scope

In-app (non-browser) assignment toasts; assignment history/audit; reassigning
done tasks; dragging TBD blockers.

## Verification

- Unit: `resolveDrop` cases (reassign / convert / no-op).
- REST attack re-test: confirm `tasks` now permits cross-user assignment while
  `profiles.manual_status` and `team_items` attribution remain locked.
- Gates: lint, tsc, vitest, build.
- Manual: drag task A→B reassigns; drag todo→card converts + leaves the list;
  second session sees moves live; assignee notified when their tab is hidden.
