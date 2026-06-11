import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lightweight "is Jira connected?" check (DB lookup only, no Jira API call).
// Used by the profile modal to show connection state.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, siteUrl: null });

  const admin = createAdminClient();
  const { data } = await admin
    .from("jira_connections")
    .select("site_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: Boolean(data),
    siteUrl: data?.site_url ?? null,
  });
}
