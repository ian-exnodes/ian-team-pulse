import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
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
  const [profiles, tasks, teamItems] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase
      .from("tasks")
      .select("*")
      .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
    supabase.from("team_items").select("*"),
  ]);

  return (
    <Dashboard
      initialProfiles={profiles.data ?? []}
      initialTasks={tasks.data ?? []}
      initialTeamItems={teamItems.data ?? []}
      currentUserId={user.id}
    />
  );
}
