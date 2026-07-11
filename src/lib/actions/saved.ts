"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { wordExplanationSchema, type WordExplanation } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";

const saveWordInputSchema = z.object({
  surface: z.string().min(1).max(80),
  explanation: wordExplanationSchema,
  mediaId: z.string().uuid().nullable(),
  cueId: z.number().int().nullable(),
  tags: z.array(z.string().max(40)).max(10),
});

export async function saveWord(input: {
  surface: string;
  explanation: WordExplanation;
  mediaId: string | null;
  cueId: number | null;
  tags: string[];
}) {
  const parsed = saveWordInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const { surface, explanation: e, mediaId, cueId, tags } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("saved_words").upsert(
    {
      user_id: user.id,
      lemma: e.lemma,
      surface,
      translation: e.meaning,
      cefr: e.cefr,
      pos: e.pos,
      gender: e.gender,
      plural: e.plural,
      ipa: e.ipa,
      example: e.examples[0] ? `${e.examples[0].de} — ${e.examples[0].en}` : null,
      tags,
      media_id: mediaId,
      cue_id: cueId,
    },
    { onConflict: "user_id,lemma" },
  );
  if (error) return { ok: false as const, error: "Could not save word." };
  revalidatePath("/vocabulary");
  return { ok: true as const };
}

const saveSentenceInputSchema = z.object({
  text: z.string().min(1).max(1000),
  translation: z.string().max(1000),
  explanationMd: z.string().max(20_000).nullable(),
  mediaId: z.string().uuid().nullable(),
  cueId: z.number().int().nullable(),
  tags: z.array(z.string().max(40)).max(10),
});

export async function saveSentence(input: z.infer<typeof saveSentenceInputSchema>) {
  const parsed = saveSentenceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("saved_sentences").insert({
    user_id: user.id,
    text: parsed.data.text,
    translation: parsed.data.translation,
    explanation_md: parsed.data.explanationMd,
    tags: parsed.data.tags,
    media_id: parsed.data.mediaId,
    cue_id: parsed.data.cueId,
  });
  if (error) return { ok: false as const, error: "Could not save sentence." };
  revalidatePath("/sentences");
  return { ok: true as const };
}

export async function deleteSavedWord(id: string) {
  const supabase = await createClient();
  await supabase.from("saved_words").delete().eq("id", id);
  revalidatePath("/vocabulary");
  return { ok: true as const };
}

export async function deleteSavedSentence(id: string) {
  const supabase = await createClient();
  await supabase.from("saved_sentences").delete().eq("id", id);
  revalidatePath("/sentences");
  return { ok: true as const };
}
