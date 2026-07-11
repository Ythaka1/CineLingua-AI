"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const searchInputSchema = z.object({
  terms: z.array(z.string().min(1).max(60)).min(1).max(12),
  mediaId: z.string().uuid().nullable(),
});

export interface CueHit {
  mediaId: string;
  mediaTitle: string;
  startMs: number;
  text: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word search over the user's German cues (RLS scopes to own media).
 * Multiple terms are OR-ed — presets like Konjunktiv II pass all their
 * trigger forms at once.
 */
export async function searchCues(input: {
  terms: string[];
  mediaId: string | null;
}): Promise<{ ok: true; hits: CueHit[] } | { ok: false; error: string }> {
  const parsed = searchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid search." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // \m / \M are Postgres regex word boundaries; imatch = case-insensitive ~*.
  const orFilter = parsed.data.terms
    .map((t) => `text.imatch.\\m${escapeRegex(t)}\\M`)
    .join(",");

  let query = supabase
    .from("subtitle_cues")
    .select("media_id, start_ms, text, media(title)")
    .eq("lang", "de")
    .or(orFilter)
    .order("media_id")
    .order("start_ms")
    .limit(150);
  if (parsed.data.mediaId) query = query.eq("media_id", parsed.data.mediaId);

  const { data, error } = await query;
  if (error) return { ok: false, error: "Search failed." };

  return {
    ok: true,
    hits: (data ?? []).map((row) => ({
      mediaId: row.media_id,
      mediaTitle:
        (row.media as unknown as { title: string } | null)?.title ?? "Unknown title",
      startMs: row.start_ms,
      text: row.text.replace(/\n/g, " "),
    })),
  };
}
