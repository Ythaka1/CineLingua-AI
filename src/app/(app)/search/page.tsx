import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { SearchClient } from "./SearchClient";

export const metadata: Metadata = { title: "Search · CineLingua AI" };

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Subtitle search</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Find every real usage across your library — a word, or a grammar pattern like
        Konjunktiv II or the Modalpartikeln <em>doch / eben / halt</em>.
      </p>
      <SearchClient media={media ?? []} />
    </div>
  );
}
