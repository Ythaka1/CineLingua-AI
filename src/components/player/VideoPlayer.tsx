"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Cue, SubtitleMode } from "@/features/subtitles/types";

import { PlayerControls } from "./PlayerControls";
import { SubtitleOverlay } from "./SubtitleOverlay";

export interface WordSelection {
  word: string;
  cue: Cue;
  /** Anchor for the floating card, relative to the player container. */
  anchor: { leftPct: number; bottomPx: number };
}

function findCue(cues: Cue[], timeMs: number): Cue | null {
  // Cues are sorted by start; binary search the last cue starting <= t.
  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].startMs <= timeMs) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (candidate === -1) return null;
  const cue = cues[candidate];
  return timeMs < cue.endMs ? cue : null;
}

export function VideoPlayer({
  src,
  deCues,
  enCues,
  initialPositionMs,
  onWordSelect,
  onSentenceSelect,
  onHeartbeat,
  overlay,
}: {
  src: string;
  deCues: Cue[];
  enCues: Cue[];
  initialPositionMs: number;
  onWordSelect: (selection: WordSelection | null) => void;
  onSentenceSelect: (cue: Cue) => void;
  /** Called ~every 5s of playback with position + seconds actually watched. */
  onHeartbeat: (positionMs: number, watchedSeconds: number) => void;
  /** Floating UI (word card) rendered inside the container so it survives fullscreen. */
  overlay?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPositionMs / 1000);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>("both");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedRef = useRef(0);

  const timeMs = currentTime * 1000;
  const deCue = useMemo(() => findCue(deCues, timeMs), [deCues, timeMs]);
  const enCue = useMemo(() => findCue(enCues, timeMs), [enCues, timeMs]);

  const video = () => videoRef.current;

  const togglePlay = useCallback(() => {
    const v = video();
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = video();
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || Infinity);
  }, []);

  const repeatCue = useCallback(() => {
    const v = video();
    if (!v) return;
    // Jump to the start of the current (or previous) German line and play.
    const target = deCue ?? findCue(deCues, timeMs - 4000) ?? null;
    const startMs =
      target?.startMs ??
      [...deCues].reverse().find((c) => c.startMs < timeMs)?.startMs ??
      0;
    v.currentTime = startMs / 1000;
    void v.play();
  }, [deCue, deCues, timeMs]);

  const changeRate = useCallback((r: number) => {
    const clamped = Math.min(2, Math.max(0.5, r));
    setRate(clamped);
    const v = video();
    if (v) v.playbackRate = clamped;
  }, []);

  const fullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, []);

  const handleWordClick = useCallback(
    (word: string, cue: Cue, target: HTMLElement) => {
      video()?.pause();
      const container = containerRef.current;
      if (!container) return;
      const rect = target.getBoundingClientRect();
      const box = container.getBoundingClientRect();
      const leftPct = ((rect.left + rect.width / 2 - box.left) / box.width) * 100;
      const bottomPx = box.bottom - rect.top + 10;
      onWordSelect({ word, cue, anchor: { leftPct, bottomPx } });
    },
    [onWordSelect],
  );

  const handleSentenceClick = useCallback(
    (cue: Cue) => {
      video()?.pause();
      onSentenceSelect(cue);
    },
    [onSentenceSelect],
  );

  // Playback bookkeeping + heartbeat.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let lastT = v.currentTime;
    const onTime = () => {
      const t = v.currentTime;
      const delta = t - lastT;
      if (delta > 0 && delta < 2) watchedRef.current += delta;
      lastT = t;
      setCurrentTime(t);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => {
      setDuration(v.duration || 0);
      if (initialPositionMs > 1000) v.currentTime = initialPositionMs / 1000;
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadedmetadata", onMeta);

    const beat = setInterval(() => {
      const watched = Math.floor(watchedRef.current);
      if (watched > 0) {
        watchedRef.current -= watched;
        onHeartbeat(Math.floor(v.currentTime * 1000), watched);
      }
    }, 5000);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("loadedmetadata", onMeta);
      clearInterval(beat);
    };
  }, [initialPositionMs, onHeartbeat]);

  // Keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(-5);
          break;
        case "ArrowRight":
          seekBy(5);
          break;
        case "j":
          seekBy(-10);
          break;
        case "l":
          seekBy(10);
          break;
        case "r":
          repeatCue();
          break;
        case "f":
          fullscreen();
          break;
        case "m": {
          const v = video();
          if (v) v.muted = !v.muted;
          break;
        }
        case "s":
          setSubtitleMode((m) =>
            m === "both" ? "de" : m === "de" ? "en" : m === "en" ? "off" : "both",
          );
          break;
        case "<":
          changeRate(rate - 0.25);
          break;
        case ">":
          changeRate(rate + 0.25);
          break;
        case "e":
          if (deCue) handleSentenceClick(deCue);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, repeatCue, fullscreen, changeRate, rate, deCue, handleSentenceClick]);

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className="group relative overflow-hidden rounded-2xl border border-border bg-black"
    >
      {/* Subtitles are rendered as an interactive overlay; captions come from imported files. */}
      <video
        ref={videoRef}
        src={src}
        onClick={togglePlay}
        className="aspect-video w-full"
        playsInline
      />

      <SubtitleOverlay
        deCue={deCue}
        enCue={enCue}
        mode={subtitleMode}
        onWordClick={handleWordClick}
        onSentenceClick={handleSentenceClick}
      />

      <div
        className={`transition-opacity duration-200 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayerControls
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          rate={rate}
          subtitleMode={subtitleMode}
          onTogglePlay={togglePlay}
          onSeek={(s) => {
            const v = video();
            if (v) v.currentTime = s;
          }}
          onRate={changeRate}
          onSubtitleMode={setSubtitleMode}
          onRepeat={repeatCue}
          onFullscreen={fullscreen}
        />
      </div>

      {overlay}
    </div>
  );
}
