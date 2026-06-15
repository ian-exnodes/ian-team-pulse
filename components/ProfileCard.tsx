"use client";

import { useDroppable } from "@dnd-kit/core";
import { deriveStatus } from "@/lib/status";
import type { Profile, Task } from "@/lib/types";
import { QuickAddTask } from "./QuickAddTask";
import { StatusBadge } from "./StatusBadge";
import { TaskList } from "./TaskList";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function ProfileCard({
  profile,
  tasks,
  doneTodayTasks,
  isCurrentUser,
  onAddTask,
  onMarkDone,
  onReopen,
  onToggleOff,
}: {
  profile: Profile;
  tasks: Task[];
  doneTodayTasks: Task[];
  isCurrentUser: boolean;
  onAddTask: (title: string, link: string) => void;
  onMarkDone: (task: Task) => void;
  onReopen: (task: Task) => void;
  onToggleOff: () => void;
}) {
  const status = deriveStatus(profile, tasks);
  const workingTasks = tasks
    .filter((t) => t.status === "inprogress")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Drop a dragged task/todo here to assign it to this member.
  const { setNodeRef, isOver } = useDroppable({ id: profile.id });

  return (
    <article
      ref={setNodeRef}
      className={`flex flex-col gap-4 rounded-2xl bg-olivia-surface p-5 shadow-sm transition-shadow ${
        isOver
          ? "ring-2 ring-olivia-pink"
          : isCurrentUser
            ? "ring-1 ring-olivia-pink/40"
            : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-olivia-raised text-sm font-semibold text-olivia-pink"
            style={{ color: profile.name_color ?? undefined }}
          >
            {initials(profile.display_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-olivia-cream">
            <span style={{ color: profile.name_color ?? undefined }}>
              {profile.display_name}
            </span>
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-olivia-muted">(you)</span>
            )}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
          Working on
        </h3>
        {/* Only you can mark your own tasks done. */}
        <TaskList
          tasks={workingTasks}
          variant="working"
          onMarkDone={isCurrentUser ? onMarkDone : undefined}
        />
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
          Done today
        </h3>
        {/* Only you can reopen your own done tasks. */}
        <TaskList
          tasks={doneTodayTasks}
          variant="doneToday"
          onReopen={isCurrentUser ? onReopen : undefined}
        />
      </div>

      {isCurrentUser && (
        <div className="space-y-3 border-t border-olivia-border pt-3">
          <QuickAddTask placeholder="What are you working on?" onAdd={onAddTask} />
          <button
            onClick={onToggleOff}
            className="text-xs text-olivia-muted underline-offset-2 hover:text-olivia-pink hover:underline"
          >
            {profile.manual_status === "off" ? "I'm back" : "Set me as Off"}
          </button>
        </div>
      )}
    </article>
  );
}
