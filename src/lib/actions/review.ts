"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ReviewGrade = "again" | "hard" | "good" | "easy";

const gradeInputSchema = z.object({
  kind: z.enum(["word", "sentence"]),
  id: z.string().uuid(),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

/**
 * SM-2 style scheduling. "again" resets the card; the ease factor drifts
 * with performance and the interval grows multiplicatively.
 */
function schedule(intervalDays: number, ease: number, grade: ReviewGrade) {
  let nextEase = ease;
  let nextInterval: number;

  switch (grade) {
    case "again":
      nextEase = Math.max(1.3, ease - 0.2);
      nextInterval = 0; // due again today
      break;
    case "hard":
      nextEase = Math.max(1.3, ease - 0.15);
      nextInterval = Math.max(1, Math.round(intervalDays * 1.2)) || 1;
      break;
    case "good":
      nextInterval = intervalDays === 0 ? 1 : Math.round(intervalDays * ease);
      break;
    case "easy":
      nextEase = ease + 0.15;
      nextInterval = intervalDays === 0 ? 3 : Math.round(intervalDays * ease * 1.3);
      break;
  }

  const next = new Date();
  if (nextInterval === 0) {
    next.setMinutes(next.getMinutes() + 10);
  } else {
    next.setDate(next.getDate() + nextInterval);
  }
  return { intervalDays: nextInterval, ease: nextEase, nextReview: next.toISOString() };
}

export async function gradeItem(input: z.infer<typeof gradeInputSchema>) {
  const parsed = gradeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const { kind, id, grade } = parsed.data;

  const supabase = await createClient();
  const table = kind === "word" ? ("saved_words" as const) : ("saved_sentences" as const);

  const { data: row } = await supabase
    .from(table)
    .select("interval_days, ease")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Card not found." };

  const s = schedule(row.interval_days, row.ease, grade);
  const { error } = await supabase
    .from(table)
    .update({ interval_days: s.intervalDays, ease: s.ease, next_review: s.nextReview })
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not save review." };

  revalidatePath("/review");
  return { ok: true as const, nextReview: s.nextReview };
}
