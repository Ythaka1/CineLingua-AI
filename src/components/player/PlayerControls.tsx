"use client";

import type { SubtitleMode } from "@/features/subtitles/types";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const SUB_MODES: SubtitleMode[] = ["both", "de", "en", "off"];
const SUB_LABEL: Record<SubtitleMode, string> = {
  both: "DE+EN",
  de: "DE",
  en: "EN",
  off: "Off",
};

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function PlayerControls({
  playing,
  currentTime,
  duration,
  rate,
  subtitleMode,
  onTogglePlay,
  onSeek,
  onRate,
  onSubtitleMode,
  onRepeat,
  onFullscreen,
}: {
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  subtitleMode: SubtitleMode;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRate: (rate: number) => void;
  onSubtitleMode: (mode: SubtitleMode) => void;
  onRepeat: () => void;
  onFullscreen: () => void;
}) {
  const btn =
    "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/15";

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pt-10 pb-3">
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={onTogglePlay} aria-label={playing ? "Pause (Space)" : "Play (Space)"} className={`${btn} w-9 text-base`}>
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="text-xs tabular-nums text-white/70">
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        <div className="flex-1" />

        <button onClick={onRepeat} title="Repeat this line (R)" className={btn}>
          ↺ Repeat
        </button>

        <select
          value={rate}
          onChange={(e) => onRate(Number(e.target.value))}
          aria-label="Playback speed"
          className="h-8 cursor-pointer rounded-lg border-0 bg-white/10 px-2 text-[13px] font-medium text-white/85 hover:bg-white/15 focus:outline-none"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s} className="bg-elevated text-foreground">
              {s}×
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            const next = SUB_MODES[(SUB_MODES.indexOf(subtitleMode) + 1) % SUB_MODES.length];
            onSubtitleMode(next);
          }}
          title="Subtitles (S)"
          className={btn}
        >
          ▭ {SUB_LABEL[subtitleMode]}
        </button>

        <button onClick={onFullscreen} title="Fullscreen (F)" className={`${btn} w-9`}>
          ⛶
        </button>
      </div>
    </div>
  );
}
