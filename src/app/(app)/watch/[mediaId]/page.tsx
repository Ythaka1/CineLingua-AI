import { notFound } from "next/navigation";

import type { Cue } from "@/features/subtitles/types";
import { createClient } from "@/lib/supabase/server";

import { WatchClient } from "./WatchClient";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ mediaId: string }>;
}) {
  const { mediaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: media }, { data: cues }, { data: progress }, { data: profile }] =
    await Promise.all([
      supabase.from("media").select("id, title").eq("id", mediaId).maybeSingle(),
      supabase
        .from("subtitle_cues")
        .select("id, lang, cue_index, start_ms, end_ms, text")
        .eq("media_id", mediaId)
        .order("start_ms"),
      supabase
        .from("watch_progress")
        .select("position_ms")
        .eq("media_id", mediaId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("cefr_level, target_dialect")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (!media) notFound();

  const toCue = (c: NonNullable<typeof cues>[number]): Cue => ({
    id: c.id,
    index: c.cue_index,
    startMs: c.start_ms,
    endMs: c.end_ms,
    text: c.text,
  });
  const deCues = (cues ?? []).filter((c) => c.lang === "de").map(toCue);
  const enCues = (cues ?? []).filter((c) => c.lang === "en").map(toCue);

  return (
    <WatchClient
      mediaId={media.id}
      title={media.title}
      deCues={deCues}
      enCues={enCues}
      initialPositionMs={progress?.position_ms ?? 0}
      cefr={profile?.cefr_level ?? "B2"}
      dialect={profile?.target_dialect ?? "DE"}
    />
  );
}
