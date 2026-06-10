import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only same-origin paths - prefix checks miss tricks like /\evil.com
  // (browsers normalize \ to /), so canonicalize via URL parsing.
  const rawNext = searchParams.get("next") ?? "/";
  let next = "/";
  try {
    const candidate = new URL(rawNext, url.origin);
    if (candidate.origin === url.origin) {
      next = candidate.pathname + candidate.search;
    }
  } catch {
    next = "/";
  }

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error");
}
