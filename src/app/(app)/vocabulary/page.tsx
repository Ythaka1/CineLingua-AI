import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { VocabularyList } from "./VocabularyList";

export const metadata: Metadata = { title: "Vocabulary · CineLingua AI" };

export default async function VocabularyPage() {
  const supabase = await createClient();
  const { data: words } = await supabase
    .from("saved_words")
    .select(
      "id, lemma, surface, translation, cefr, pos, gender, plural, ipa, example, tags, next_review, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Vocabulary</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Every word you clicked and kept. They feed the review queue automatically.
      </p>
      <VocabularyList words={words ?? []} />
    </div>
  );
}
