"use client";

import { useCallback, useEffect, useState } from "react";

import { ChatPanel } from "@/components/ai/ChatPanel";
import { IdiomsPanel } from "@/components/ai/IdiomsPanel";
import { ModeSwitcher } from "@/components/ai/ModeSwitcher";
import { SentencePanel } from "@/components/ai/SentencePanel";
import { useAiMode } from "@/components/ai/useAiMode";
import { WordCard } from "@/components/ai/WordCard";
import { VideoPlayer, type WordSelection } from "@/components/player/VideoPlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Cue } from "@/features/subtitles/types";
import type { CefrLevel, TargetDialect } from "@/lib/ai/schemas";
import { recordProgress } from "@/lib/actions/progress";
import { getVideo, putVideo } from "@/lib/video-store";

type Tab = "explain" | "chat" | "idioms";

export function WatchClient({
  mediaId,
  title,
  deCues,
  enCues,
  initialPositionMs,
  cefr,
  dialect,
}: {
  mediaId: string;
  title: string;
  deCues: Cue[];
  enCues: Cue[];
  initialPositionMs: number;
  cefr: CefrLevel;
  dialect: TargetDialect;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [videoMissing, setVideoMissing] = useState(false);
  const [wordSel, setWordSel] = useState<WordSelection | null>(null);
  const [sentenceCue, setSentenceCue] = useState<Cue | null>(null);
  const [tab, setTab] = useState<Tab>("explain");
  const [positionMs, setPositionMs] = useState(initialPositionMs);
  const [mode, setMode] = useAiMode();

  // The video file lives in the browser (IndexedDB) — re-attach if evicted.
  useEffect(() => {
    let url: string | null = null;
    getVideo(mediaId).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setSrc(url);
      } else {
        setVideoMissing(true);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId]);

  async function reattach(file: File) {
    await putVideo(mediaId, file);
    setSrc(URL.createObjectURL(file));
    setVideoMissing(false);
  }

  const handleHeartbeat = useCallback(
    (posMs: number, watchedSeconds: number) => {
      setPositionMs(posMs);
      void recordProgress({ mediaId, positionMs: posMs, watchedSeconds });
    },
    [mediaId],
  );

  const handleSentenceSelect = useCallback((cue: Cue) => {
    setWordSel(null);
    setSentenceCue(cue);
    setTab("explain");
  }, []);

  // A couple of lines either side, for context in the sentence prompt.
  const surrounding = sentenceCue
    ? deCues
        .filter((c) => Math.abs(c.index - sentenceCue.index) <= 2 && c.id !== sentenceCue.id)
        .map((c) => c.text.replace(/\n/g, " "))
        .join("\n")
    : "";

  const tabs: { id: Tab; label: string }[] = [
    { id: "explain", label: "Explain" },
    { id: "chat", label: "Chat" },
    { id: "idioms", label: "Idioms" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-4 truncate text-xl font-semibold tracking-tight">{title}</h1>

      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          {src ? (
            <VideoPlayer
              src={src}
              deCues={deCues}
              enCues={enCues}
              initialPositionMs={initialPositionMs}
              onWordSelect={setWordSel}
              onSentenceSelect={handleSentenceSelect}
              onHeartbeat={handleHeartbeat}
              overlay={
                wordSel ? (
                  <WordCard
                    selection={wordSel}
                    mediaId={mediaId}
                    cefr={cefr}
                    dialect={dialect}
                    mode={mode}
                    onClose={() => setWordSel(null)}
                  />
                ) : null
              }
            />
          ) : videoMissing ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface">
              <p className="text-sm text-muted">
                The video file isn&apos;t on this device — re-attach it to keep watching.
              </p>
              <label className="cursor-pointer rounded-[--radius-control] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/85">
                Choose video file
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void reattach(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <Skeleton className="aspect-video w-full rounded-2xl" />
          )}

          <p className="mt-3 text-xs text-muted">
            Space play · ←/→ ±5s · J/L ±10s · R repeat line · S subtitles · E explain line ·
            &lt;/&gt; speed · F fullscreen — click any word for an instant explanation.
          </p>
        </div>

        <aside className="flex h-[520px] w-full flex-col rounded-2xl border border-border bg-surface p-4 xl:h-auto xl:max-h-[calc(100dvh-8rem)] xl:w-[380px] xl:shrink-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-1" role="tablist" aria-label="Tutor panel">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    tab === t.id
                      ? "bg-accent-soft text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ModeSwitcher mode={mode} onChange={setMode} />
          </div>

          <div className="min-h-0 flex-1">
            {tab === "explain" ? (
              sentenceCue ? (
                <SentencePanel
                  cue={sentenceCue}
                  surrounding={surrounding}
                  mediaId={mediaId}
                  cefr={cefr}
                  dialect={dialect}
                  mode={mode}
                />
              ) : (
                <p className="pt-2 text-sm text-muted">
                  Click the ✦ next to a subtitle line (or press E) and the tutor will break
                  it down — translation, grammar, register, and how Germans actually say it.
                </p>
              )
            ) : null}
            {tab === "chat" ? (
              <ChatPanel
                mediaId={mediaId}
                positionMs={positionMs}
                cefr={cefr}
                dialect={dialect}
                mode={mode}
              />
            ) : null}
            {tab === "idioms" ? (
              <IdiomsPanel
                mediaId={mediaId}
                positionMs={positionMs}
                cefr={cefr}
                dialect={dialect}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
