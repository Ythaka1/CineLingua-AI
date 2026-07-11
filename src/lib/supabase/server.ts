import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Uses the caller's session cookie, so RLS applies.
 */
export async function createClient() {
  // cookies() first: it opts the route into dynamic rendering, so builds
  // without env vars don't try to prerender pages that need Supabase.
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — safe to ignore when the
          // middleware refreshes sessions.
        }
      },
    },
  });
}
