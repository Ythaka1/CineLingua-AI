"use client";

import { tokenize } from "@/features/subtitles/tokenize";
import type { Cue, SubtitleMode } from "@/features/subtitles/types";

export function SubtitleOverlay({
  deCue,
  enCue,
  mode,
  onWordClick,
  onSentenceClick,
}: {
  deCue: Cue | null;
  enCue: Cue | null;
  mode: SubtitleMode;
  onWordClick: (word: string, cue: Cue, target: HTMLElement) => void;
  onSentenceClick: (cue: Cue) => void;
}) {
  if (mode === "off") return null;
  const showDe = (mode === "both" || mode === "de") && deCue;
  const showEn = (mode === "both" || mode === "en") && enCue;
  if (!showDe && !showEn) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[72px] flex flex-col items-center gap-1.5 px-6 text-center">
      {showDe && deCue ? (
        <div className="pointer-events-auto max-w-3xl rounded-xl bg-black/55 px-4 py-2 backdrop-blur-sm">
          <p className="text-[1.4rem] leading-snug font-semibold tracking-[0.01em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
            {deCue.text.split("\n").map((line, li) => (
              <span key={li} className="block">
                {tokenize(line).map((token, ti) =>
                  token.isWord ? (
                    <button
                      key={ti}
                      onClick={(e) => onWordClick(token.text, deCue, e.currentTarget)}
                      className="rounded px-0.5 transition-colors duration-150 hover:bg-accent/35 hover:text-white focus-visible:bg-accent/35"
                    >
                      {token.text}
                    </button>
                  ) : (
                    <span key={ti}>{token.text}</span>
                  ),
                )}
              </span>
            ))}
            <button
              onClick={() => onSentenceClick(deCue)}
              title="Explain this sentence (E)"
              aria-label="Explain this sentence"
              className="ml-2 inline-flex h-6 w-6 -translate-y-0.5 items-center justify-center rounded-full bg-accent/25 align-middle text-[13px] text-accent transition-colors hover:bg-accent hover:text-white"
            >
              ✦
            </button>
          </p>
        </div>
      ) : null}
      {showEn && enCue ? (
        <p className="pointer-events-auto max-w-2xl rounded-lg bg-black/40 px-3 py-1 text-[1.02rem] leading-snug text-white/65 backdrop-blur-sm">
          {enCue.text.replace(/\n/g, " ")}
        </p>
      ) : null}
    </div>
  );
}
