import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl } from "@/lib/jira";

const STATE_COOKIE = "jira_oauth_state";

// Start the Jira OAuth flow: stash a CSRF state cookie and redirect the user
// to Atlassian's consent screen.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/?jira=misconfigured", request.url));
  }

  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const url = authorizeUrl({
    clientId,
    redirectUri: `${origin}/api/jira/callback`,
    state,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  });
  return res;
}
