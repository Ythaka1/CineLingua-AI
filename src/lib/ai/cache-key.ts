import { createHash } from "node:crypto";

import type { AiMode, CefrLevel, TargetDialect } from "@/lib/ai/schemas";

/**
 * Deterministic key for `ai_cache`. The same word/sentence at the same
 * level, mode, and dialect must never cost two API calls — so the key is
 * a hash of exactly those inputs and nothing else (no user id, no context
 * for words: the surrounding sentence IS part of the meaning, so it is
 * included for `word`, and the sentence text is the input for `sentence`).
 */
export function buildCacheKey(params: {
  kind: "word" | "sentence";
  /** For words: `${word}|${context}`. For sentences: the sentence text. */
  input: string;
  mode: AiMode;
  cefr: CefrLevel;
  dialect: TargetDialect;
}): string {
  const raw = [
    params.kind,
    params.input.trim().toLowerCase(),
    params.mode,
    params.cefr,
    params.dialect,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}
