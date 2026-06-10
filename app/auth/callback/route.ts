import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PKCE code exchange - the flow used by Supabase's DEFAULT magic-link email
// template (ConfirmationURL). The token_hash flow in /auth/confirm is only
// reachable after customizing the email template, which new Supabase
// projects allow only with custom SMTP configured.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Only same-origin paths - prefix checks miss tricks like /\evil.com.
  const rawNext = url.searchParams.get("next") ?? "/";
  let next = "/";
  try {
    const candidate = new URL(rawNext, url.origin);
    if (candidate.origin === url.origin) {
      next = candidate.pathname + candidate.search;
    }
  } catch {
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error");
}
