import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import type { ActivityRow } from "@/lib/activity";
import { recentTaskCutoffIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  // Defense in depth - never trust the proxy alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = recentTaskCutoffIso();
  const [profiles, tasks, teamItems, activity] = await Promise.all([
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

  return (
    <Dashboard
      initialProfiles={profiles.data ?? []}
      initialTasks={tasks.data ?? []}
      initialTeamItems={teamItems.data ?? []}
      initialActivity={(activity.data ?? []) as ActivityRow[]}
      currentUserId={user.id}
    />
  );
}
