"use server";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { AI_MODEL, getAnthropic } from "@/lib/ai/anthropic";
import { buildCacheKey } from "@/lib/ai/cache-key";
import { cacheGet, cachePut } from "@/lib/ai/cache";
import { wordSystemPrompt, wordUserPrompt } from "@/lib/ai/prompts";
import {
  cefrLevelSchema,
  explainWordInputSchema,
  idiomListSchema,
  targetDialectSchema,
  wordExplanationSchema,
  type ExplainWordInput,
  type IdiomList,
  type WordExplanation,
} from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export interface ExplainWordResult {
  ok: true;
  explanation: WordExplanation;
  cached: boolean;
}
export interface ExplainWordError {
  ok: false;
  error: string;
}

/**
 * Word card: typed JSON, non-streaming, cached in ai_cache.
 * The same word+context at the same level/mode/dialect never costs two calls.
 */
export async function explainWord(
  rawInput: ExplainWordInput,
): Promise<ExplainWordResult | ExplainWordError> {
  const parsed = explainWordInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const key = buildCacheKey({
    kind: "word",
    input: `${input.word}|${input.context}`,
    mode: input.mode,
    cefr: input.cefr,
    dialect: input.dialect,
  });

  const hit = await cacheGet(supabase, key);
  if (hit !== null) {
    const cached = wordExplanationSchema.safeParse(hit);
    if (cached.success) return { ok: true, explanation: cached.data, cached: true };
  }

  try {
    const message = await getAnthropic().messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      system: wordSystemPrompt(input),
      messages: [{ role: "user", content: wordUserPrompt(input) }],
      output_config: { format: zodOutputFormat(wordExplanationSchema) },
    });

    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { ok: false, error: "The tutor couldn't explain this one. Try again." };
    }

    const explanation = wordExplanationSchema.parse(message.parsed_output);
    await cachePut(supabase, key, explanation);
    return { ok: true, explanation, cached: false };
  } catch (err) {
    console.error("[ai] explainWord failed:", err);
    return { ok: false, error: "AI explanation failed. Check your connection and try again." };
  }
}

const detectIdiomsInputSchema = z.object({
  mediaId: z.string().uuid(),
  positionMs: z.number().int().nonnegative(),
  cefr: cefrLevelSchema,
  dialect: targetDialectSchema,
});

export type DetectIdiomsResult =
  | { ok: true; idioms: IdiomList["idioms"]; cached: boolean }
  | { ok: false; error: string };

/**
 * Phase 5: idiom-detection pass over the current scene's cues.
 * Typed JSON, cached per scene-window (keyed by the cue text itself).
 */
export async function detectIdioms(
  rawInput: z.infer<typeof detectIdiomsInputSchema>,
): Promise<DetectIdiomsResult> {
  const parsed = detectIdiomsInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cues } = await supabase
    .from("subtitle_cues")
    .select("text")
    .eq("media_id", input.mediaId)
    .eq("lang", "de")
    .gte("start_ms", Math.max(0, input.positionMs - 90_000))
    .lte("start_ms", input.positionMs + 90_000)
    .order("start_ms")
    .limit(80);
  const sceneText = (cues ?? []).map((c) => c.text.replace(/\n/g, " ")).join("\n");
  if (!sceneText) return { ok: false, error: "No subtitles in this scene." };

  const key = buildCacheKey({
    kind: "idioms",
    input: sceneText,
    mode: "NativeFriend",
    cefr: input.cefr,
    dialect: input.dialect,
  });
  const hit = await cacheGet(supabase, key);
  if (hit !== null) {
    const cached = idiomListSchema.safeParse(hit);
    if (cached.success) return { ok: true, idioms: cached.data.idioms, cached: true };
  }

  try {
    const message = await getAnthropic().messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      system:
        "You detect German idioms and fixed expressions in film subtitles for a language learner. Only report genuine idioms, collocational fixed expressions, or figurative set phrases actually present in the given lines — never invent, never include plain literal sentences. If there are none, return an empty list. Quote each phrase exactly as it appears.",
      messages: [{ role: "user", content: `Subtitles from the scene:\n${sceneText}` }],
      output_config: { format: zodOutputFormat(idiomListSchema) },
    });
    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { ok: false, error: "Idiom scan failed. Try again." };
    }
    const list = idiomListSchema.parse(message.parsed_output);
    await cachePut(supabase, key, list);
    return { ok: true, idioms: list.idioms, cached: false };
  } catch (err) {
    console.error("[ai] detectIdioms failed:", err);
    return { ok: false, error: "Idiom scan failed. Try again." };
  }
}
