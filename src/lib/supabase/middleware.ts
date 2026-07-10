import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/config";

let warnedMissingEnv = false;

/** Refreshes the auth session on every request (called from src/middleware.ts). */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  // Not configured yet (no .env.local) — run without auth instead of
  // crashing every request. Auth-gated pages will surface a clear error
  // when they actually need a Supabase client.
  if (!env) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY " +
          "not set — skipping session refresh. Copy .env.example to .env.local " +
          "and fill in your project's values.",
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Required: getUser() revalidates the token and triggers cookie refresh.
  await supabase.auth.getUser();

  return response;
}
