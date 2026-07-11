"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { recordStudyTime } from "@/lib/actions/progress";
import { gradeItem, type ReviewGrade } from "@/lib/actions/review";

export interface ReviewCard {
  kind: "word" | "sentence";
  id: string;
  front: string;
  back: string;
  detail: string;
  speakText: string;
}

const GRADES: { grade: ReviewGrade; label: string; hint: string; className: string }[] = [
  { grade: "again", label: "Again", hint: "1", className: "text-danger" },
  { grade: "hard", label: "Hard", hint: "2", className: "text-foreground/80" },
  { grade: "good", label: "Good", hint: "3", className: "text-accent" },
  { grade: "easy", label: "Easy", hint: "4", className: "text-success" },
];

function speak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.92;
  speechSynthesis.speak(u);
}

export function ReviewClient({ initialCards }: { initialCards: ReviewCard[] }) {
  const [queue, setQueue] = useState(initialCards);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const lastGradeAt = useRef(Date.now());
  const pendingSeconds = useRef(0);

  const card = queue[0] ?? null;

  // Keyboard: Space/Enter reveals, 1–4 grades.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || !card) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        void grade(GRADES[Number(e.key) - 1].grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card?.id, queue.length]);

  async function grade(g: ReviewGrade) {
    if (!card) return;

    // Count study time toward the daily goal (capped per card).
    const elapsed = Math.min(60, Math.round((Date.now() - lastGradeAt.current) / 1000));
    lastGradeAt.current = Date.now();
    pendingSeconds.current += elapsed;
    if (pendingSeconds.current >= 30 || queue.length === 1) {
      const toSend = pendingSeconds.current;
      pendingSeconds.current = 0;
      void recordStudyTime(toSend);
    }

    setRevealed(false);
    setDone((d) => d + 1);
    setQueue((q) => {
      const [current, ...rest] = q;
      // "Again" re-queues the card at the back of this session.
      return g === "again" ? [...rest, current] : rest;
    });
    void gradeItem({ kind: card.kind, id: card.id, grade: g });
  }

  if (!card) {
    return (
      <EmptyState
        icon="✓"
        title={done > 0 ? "Session complete" : "Nothing due right now"}
        description={
          done > 0
            ? `You reviewed ${done} card${done === 1 ? "" : "s"}. The next batch appears when the intervals come due.`
            : "Save words and sentences while watching — they show up here on a spaced-repetition schedule."
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        {queue.length} left in this session
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${card.kind}-${card.id}-${done}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="rounded-2xl border border-border bg-surface p-8"
        >
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
            {card.kind === "word" ? "Word" : "Sentence"}
          </p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="text-2xl leading-snug font-semibold">{card.front}</p>
            <button
              onClick={() => speak(card.speakText)}
              aria-label="Pronounce"
              className="mt-1 text-lg text-muted transition-colors hover:text-accent"
            >
              🔊
            </button>
          </div>

          {revealed ? (
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-lg text-foreground/90">{card.back}</p>
              {card.detail ? (
                <p className="mt-2 text-sm whitespace-pre-line text-muted">{card.detail}</p>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex justify-center gap-2">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Show answer (Space)</Button>
        ) : (
          GRADES.map((g) => (
            <button
              key={g.grade}
              onClick={() => void grade(g.grade)}
              className={`rounded-[--radius-control] border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:bg-elevated ${g.className}`}
            >
              {g.label}
              <span className="ml-1.5 text-[11px] text-muted">{g.hint}</span>
            </button>
          ))
        )}
      </div>

    </div>
  );
}
