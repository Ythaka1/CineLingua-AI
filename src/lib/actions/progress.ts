"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Heartbeat from the player: persists the resume position and logs watched
 * seconds into daily_activity (goal/streak). Also refreshes profiles.streak.
 */
export async function recordProgress(input: {
  mediaId: string;
  positionMs: number;
  watchedSeconds: number;
}) {
  const parsed = z
    .object({
      mediaId: z.string().uuid(),
      positionMs: z.number().int().nonnegative(),
      watchedSeconds: z.number().int().min(0).max(600),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  await supabase.from("watch_progress").upsert(
    {
      user_id: user.id,
      media_id: parsed.data.mediaId,
      position_ms: parsed.data.positionMs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,media_id" },
  );

  if (parsed.data.watchedSeconds > 0) {
    await supabase.rpc("add_activity", { p_seconds: parsed.data.watchedSeconds });
    await refreshStreak(user.id);
  }
  return { ok: true as const };
}

/** Review sessions also count toward the daily goal. */
export async function recordStudyTime(seconds: number) {
  const parsed = z.number().int().min(1).max(600).safeParse(seconds);
  if (!parsed.success) return { ok: false as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  await supabase.rpc("add_activity", { p_seconds: parsed.data });
  await refreshStreak(user.id);
  return { ok: true as const };
}

/** Streak = consecutive days (ending today) with any logged activity. */
async function refreshStreak(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_activity")
    .select("day")
    .order("day", { ascending: false })
    .limit(400);
  if (!data) return;

  const days = new Set(data.map((d) => d.day));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!days.has(iso)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  await supabase.from("profiles").update({ streak }).eq("id", userId);
}
