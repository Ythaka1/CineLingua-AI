import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { ImportCard } from "./ImportCard";
import { MediaGrid } from "./MediaGrid";

export const metadata: Metadata = { title: "Library · CineLingua AI" };

export default async function LibraryPage() {
  const supabase = await createClient();
  const [{ data: media }, { data: progress }] = await Promise.all([
    supabase
      .from("media")
      .select("id, title, duration_ms, poster_url, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("watch_progress").select("media_id, position_ms"),
  ]);

  const progressByMedia = new Map(
    (progress ?? []).map((p) => [p.media_id, p.position_ms]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted">
            Your movies and shows. Files stay on this device — only subtitles and
            progress sync.
          </p>
        </div>
      </div>

      <ImportCard />

      <div className="mt-8">
        <MediaGrid
          items={(media ?? []).map((m) => ({
            id: m.id,
            title: m.title,
            durationMs: m.duration_ms,
            posterUrl: m.poster_url,
            positionMs: progressByMedia.get(m.id) ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
