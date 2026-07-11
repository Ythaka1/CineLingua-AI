import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export async function cacheGet(supabase: Db, key: string): Promise<unknown | null> {
  const { data } = await supabase
    .from("ai_cache")
    .select("payload")
    .eq("key", key)
    .maybeSingle();
  return data?.payload ?? null;
}

export async function cachePut(supabase: Db, key: string, payload: unknown): Promise<void> {
  // Insert-only cache; a concurrent duplicate insert is fine to ignore.
  await supabase.from("ai_cache").insert({ key, payload }).select().maybeSingle();
}
