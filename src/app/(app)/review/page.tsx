import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { ReviewClient, type ReviewCard } from "./ReviewClient";

export const metadata: Metadata = { title: "Review · CineLingua AI" };

export default async function ReviewPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: words }, { data: sentences }] = await Promise.all([
    supabase
      .from("saved_words")
      .select("id, lemma, surface, translation, gender, plural, ipa, example, next_review")
      .lte("next_review", now)
      .order("next_review")
      .limit(50),
    supabase
      .from("saved_sentences")
      .select("id, text, translation, next_review")
      .lte("next_review", now)
      .order("next_review")
      .limit(25),
  ]);

  const cards: ReviewCard[] = [
    ...(words ?? []).map((w) => ({
      kind: "word" as const,
      id: w.id,
      front: w.gender ? `${w.gender} ${w.lemma}` : w.lemma,
      back: w.translation,
      detail: [
        w.plural ? `Plural: ${w.plural}` : null,
        w.ipa ? `/${w.ipa}/` : null,
        w.example,
      ]
        .filter((x): x is string => Boolean(x))
        .join("\n"),
      speakText: w.lemma,
    })),
    ...(sentences ?? []).map((s) => ({
      kind: "sentence" as const,
      id: s.id,
      front: s.text,
      back: s.translation,
      detail: "",
      speakText: s.text,
    })),
  ].sort(() => Math.random() - 0.5);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Spaced repetition over everything you saved — words and whole sentences.
      </p>
      <ReviewClient initialCards={cards} />
    </div>
  );
}
