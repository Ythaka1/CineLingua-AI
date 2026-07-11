"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import type { WordSelection } from "@/components/player/VideoPlayer";
import { Button } from "@/components/ui/Button";
import { TextSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import { explainWord } from "@/lib/ai/actions";
import type { AiMode, CefrLevel, TargetDialect, WordExplanation } from "@/lib/ai/schemas";
import { saveWord } from "@/lib/actions/saved";

function speak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.92;
  speechSynthesis.speak(utterance);
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; explanation: WordExplanation };

export function WordCard({
  selection,
  mediaId,
  cefr,
  dialect,
  mode,
  onClose,
}: {
  selection: WordSelection;
  mediaId: string;
  cefr: CefrLevel;
  dialect: TargetDialect;
  mode: AiMode;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const context = selection.cue.text.replace(/\n/g, " ");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setSaved("idle");
    explainWord({ word: selection.word, context, cefr, mode, dialect }).then((res) => {
      if (cancelled) return;
      if (res.ok) setState({ status: "ready", explanation: res.explanation });
      else setState({ status: "error", message: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [selection.word, context, cefr, mode, dialect]);

  async function handleSave() {
    if (state.status !== "ready" || saved !== "idle") return;
    setSaved("saving");
    const res = await saveWord({
      surface: selection.word,
      explanation: state.explanation,
      mediaId,
      cueId: selection.cue.id,
      tags: [state.explanation.pos, `cefr:${state.explanation.cefr}`],
    });
    setSaved(res.ok ? "done" : "idle");
  }

  const left = Math.min(Math.max(selection.anchor.leftPct, 18), 82);
  const e = state.status === "ready" ? state.explanation : null;

  return (
    <AnimatePresence>
      <motion.div
        key={`${selection.word}-${selection.cue.id}`}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        role="dialog"
        aria-label={`Explanation of ${selection.word}`}
        className="glass absolute z-20 w-[340px] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl p-4 shadow-2xl"
        style={{ left: `${left}%`, bottom: selection.anchor.bottomPx }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold">
                {e?.gender ? <span className="text-accent">{e.gender} </span> : null}
                {e?.lemma ?? selection.word}
              </h3>
              {e?.ipa ? <span className="text-xs text-muted">/{e.ipa}/</span> : null}
              <button
                onClick={() => speak(e?.lemma ?? selection.word)}
                title="Pronounce"
                aria-label="Pronounce"
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                🔊
              </button>
            </div>
            {e ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Tag tone="accent">{e.cefr}</Tag>
                <Tag>{e.pos}</Tag>
                {e.plural ? <Tag>pl. {e.plural}</Tag> : null}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 max-h-[300px] overflow-y-auto pr-1 text-sm">
          {state.status === "loading" ? <TextSkeleton lines={5} /> : null}

          {state.status === "error" ? (
            <p className="text-danger">{state.message}</p>
          ) : null}

          {e ? (
            <div className="space-y-3">
              <p className="font-medium text-foreground">{e.meaning}</p>
              {e.conjugation ? (
                <p className="text-[13px] text-muted">
                  <span className="text-foreground/80">Conjugation:</span> {e.conjugation}
                </p>
              ) : null}
              {e.examples[0] ? (
                <div className="rounded-xl bg-white/[0.04] p-2.5 text-[13px]">
                  <p className="text-foreground/90">„{e.examples[0].de}“</p>
                  <p className="mt-0.5 text-muted">{e.examples[0].en}</p>
                </div>
              ) : null}
              {e.collocations.length > 0 ? (
                <p className="text-[13px] text-muted">
                  <span className="text-foreground/80">Goes with:</span>{" "}
                  {e.collocations.join(" · ")}
                </p>
              ) : null}
              {e.synonyms.length > 0 ? (
                <p className="text-[13px] text-muted">
                  <span className="text-foreground/80">Similar:</span> {e.synonyms.join(", ")}
                </p>
              ) : null}
              <p className="text-[13px] text-muted">
                <span className="text-danger/90">Watch out:</span> {e.commonMistake}
              </p>
              <p className="text-[13px] text-muted">
                <span className="text-success/90">Remember:</span> {e.memoryTip}
              </p>
            </div>
          ) : null}
        </div>

        {e ? (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted">in „{selection.word}“ context</span>
            <Button size="sm" onClick={handleSave} disabled={saved !== "idle"}>
              {saved === "done" ? "✓ Saved" : saved === "saving" ? "Saving…" : "+ Save word"}
            </Button>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
