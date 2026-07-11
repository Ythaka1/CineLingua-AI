import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { SentenceList } from "./SentenceList";

export const metadata: Metadata = { title: "Sentences · CineLingua AI" };

export default async function SentencesPage() {
  const supabase = await createClient();
  const { data: sentences } = await supabase
    .from("saved_sentences")
    .select("id, text, translation, explanation_md, tags, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Saved sentences</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Whole lines you asked the tutor to break down, with their full explanations.
      </p>
      <SentenceList sentences={sentences ?? []} />
    </div>
  );
}
