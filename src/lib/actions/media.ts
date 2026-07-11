"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { SubtitleLang } from "@/types/database";

const createMediaSchema = z.object({
  title: z.string().min(1).max(200),
  durationMs: z.number().int().nonnegative().nullable(),
  posterUrl: z.string().max(200_000).nullable(), // small data-URI poster
});

const cueSchema = z.object({
  index: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string().min(1).max(2000),
});

export async function createMedia(input: z.infer<typeof createMediaSchema>) {
  const parsed = createMediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data, error } = await supabase
    .from("media")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      duration_ms: parsed.data.durationMs,
      poster_url: parsed.data.posterUrl,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: "Could not create media." };

  revalidatePath("/library");
  return { ok: true as const, mediaId: data.id };
}

export async function insertCues(
  mediaId: string,
  lang: SubtitleLang,
  cues: z.infer<typeof cueSchema>[],
) {
  const parsed = z.array(cueSchema).max(20_000).safeParse(cues);
  if (!parsed.success || !z.string().uuid().safeParse(mediaId).success) {
    return { ok: false as const, error: "Invalid cues." };
  }

  const supabase = await createClient();
  const rows = parsed.data.map((c) => ({
    media_id: mediaId,
    lang,
    cue_index: c.index,
    start_ms: c.startMs,
    end_ms: c.endMs,
    text: c.text,
  }));

  // Batch inserts to stay under payload limits on long films.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("subtitle_cues").insert(rows.slice(i, i + 500));
    if (error) return { ok: false as const, error: "Could not store subtitles." };
  }
  return { ok: true as const, count: rows.length };
}

export async function deleteMedia(mediaId: string) {
  if (!z.string().uuid().safeParse(mediaId).success) {
    return { ok: false as const, error: "Invalid id." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("media").delete().eq("id", mediaId);
  if (error) return { ok: false as const, error: "Could not delete." };
  revalidatePath("/library");
  return { ok: true as const };
}
