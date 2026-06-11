import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, getPrimarySite } from "@/lib/jira";

const STATE_COOKIE = "jira_oauth_state";

// Atlassian redirects back here with ?code&state. Verify state, swap the code
// for tokens, find the Jira site, and store the connection (server-only).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?jira=${reason}`, request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("error");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("misconfigured");

  try {
    const tokens = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri: `${url.origin}/api/jira/callback`,
    });
    const { cloudId, siteUrl } = await getPrimarySite(tokens.access_token);

    const admin = createAdminClient();
    const { error } = await admin.from("jira_connections").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      cloud_id: cloudId,
      site_url: siteUrl,
    });
    if (error) throw error;
  } catch {
    return fail("error");
  }

  const res = NextResponse.redirect(new URL("/?jira=connected", request.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
