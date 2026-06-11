import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

// Service-role Supabase client. Bypasses RLS, so it is used ONLY in server
// route handlers (never the browser) and ONLY for server-locked tables like
// jira_connections. SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_
// prefix), so it is never inlined into the client bundle.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
