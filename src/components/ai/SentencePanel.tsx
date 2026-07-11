"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { TextSkeleton } from "@/components/ui/Skeleton";
import type { Cue } from "@/features/subtitles/types";
import type { AiMode, CefrLevel, TargetDialect } from "@/lib/ai/schemas";
import { streamText } from "@/lib/ai/stream-client";
import { saveSentence } from "@/lib/actions/saved";

/** Pulls the one-line natural translation out of the fixed-section markdown. */
function extractTranslation(markdown: string): string {
  const m = /##\s*Natural translation\s*\n+([^\n#]+)/i.exec(markdown);
  return m ? m[1].trim().replace(/^["„“]|["„“]$/g, "") : "";
}

export function SentencePanel({
  cue,
  surrounding,
  mediaId,
  cefr,
  dialect,
  mode,
}: {
  cue: Cue;
  surrounding: string;
  mediaId: string;
  cefr: CefrLevel;
  dialect: TargetDialect;
  mode: AiMode;
}) {
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<"streaming" | "done" | "error">("streaming");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const sentence = cue.text.replace(/\n/g, " ");

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setMarkdown("");
    setStatus("streaming");
    setSaved("idle");

    streamText(
      "/api/ai/sentence",
      { sentence, context: surrounding, cefr, mode, dialect },
      (chunk) => setMarkdown((prev) => prev + chunk),
      controller.signal,
    )
      .then(() => setStatus("done"))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Something went wrong.");
      });

    return () => controller.abort();
  }, [sentence, surrounding, cefr, mode, dialect]);

  async function handleSave() {
    if (saved !== "idle" || status !== "done") return;
    setSaved("saving");
    const res = await saveSentence({
      text: sentence,
      translation: extractTranslation(markdown),
      explanationMd: markdown,
      mediaId,
      cueId: cue.id,
      tags: [`mode:${mode}`],
    });
    setSaved(res.ok ? "done" : "idle");
  }

  return (
    <div className="flex h-full flex-col">
      <blockquote className="rounded-xl border border-border bg-white/[0.03] p-3">
        <p className="text-[15px] leading-snug font-medium">„{sentence}“</p>
      </blockquote>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {markdown ? <Markdown text={markdown} /> : null}
        {status === "streaming" && !markdown ? <TextSkeleton lines={8} /> : null}
        {status === "streaming" && markdown ? (
          <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent align-text-bottom" />
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end border-t border-border pt-3">
        <Button size="sm" onClick={handleSave} disabled={saved !== "idle" || status !== "done"}>
          {saved === "done" ? "✓ Saved" : saved === "saving" ? "Saving…" : "+ Save sentence"}
        </Button>
      </div>
    </div>
  );
}
