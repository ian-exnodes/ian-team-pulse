"use client";

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
  onToggleOff,
}: {
  profile: Profile;
  tasks: Task[];
  doneTodayTasks: Task[];
  isCurrentUser: boolean;
  onAddTask: (title: string, link: string) => void;
  onMarkDone: (task: Task) => void;
  onToggleOff: () => void;
}) {
  const status = deriveStatus(profile, tasks);
  const workingTasks = tasks
    .filter((t) => t.status === "inprogress")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
            {initials(profile.display_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">
            {profile.display_name}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Working on
        </h3>
        <TaskList tasks={workingTasks} variant="working" onMarkDone={onMarkDone} />
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Done today
        </h3>
        <TaskList tasks={doneTodayTasks} variant="doneToday" />
      </div>

      {isCurrentUser && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <QuickAddTask placeholder="What are you working on?" onAdd={onAddTask} />
          <button
            onClick={onToggleOff}
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            {profile.manual_status === "off" ? "I'm back" : "Set me as Off"}
          </button>
        </div>
      )}
    </article>
  );
}
