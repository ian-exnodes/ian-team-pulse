import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isExpired, refreshTokens, searchIssues } from "@/lib/jira";

// Return the caller's open Jira issues. Refreshes the access token if needed
// (persisting Atlassian's rotated refresh token). Tokens never leave the
// server: only the issue list is returned.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("jira_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) return NextResponse.json({ connected: false, issues: [] });

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  let accessToken = conn.access_token;
  try {
    if (isExpired(conn.expires_at, new Date())) {
      const tokens = await refreshTokens({
        refreshToken: conn.refresh_token,
        clientId,
        clientSecret,
      });
      accessToken = tokens.access_token;
      await admin
        .from("jira_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        })
        .eq("user_id", user.id);
    }

    const issues = await searchIssues({
      cloudId: conn.cloud_id,
      accessToken,
      siteUrl: conn.site_url,
    });
    return NextResponse.json({ connected: true, issues });
  } catch {
    // A dead refresh token (revoked access) can't be recovered - drop the
    // connection so the UI shows "Connect" again.
    await admin.from("jira_connections").delete().eq("user_id", user.id);
    return NextResponse.json({ connected: false, issues: [] });
  }
}
