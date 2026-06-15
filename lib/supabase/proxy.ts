import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Responses that set auth cookies must not be cached by CDNs.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // Do not run code between client creation and getClaims() - it refreshes
  // the session, and skipping it causes random logouts.
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy");

  if (!data?.claims) {
    // Supabase's default magic-link email redirects to the Site URL with
    // ?code=... - hand it to the callback route for the session exchange
    // instead of bouncing the user (and the code) to /login.
    const code = request.nextUrl.searchParams.get("code");
    if (code && !pathname.startsWith("/auth")) {
      const original = request.nextUrl.clone();
      original.searchParams.delete("code");
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      url.search = "";
      url.searchParams.set("code", code);
      url.searchParams.set("next", original.pathname + original.search);
      return NextResponse.redirect(url);
    }

    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Return the response updateSession built - creating a fresh NextResponse
  // here would desync the auth cookies.
  return supabaseResponse;
}
