"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextSkeleton } from "@/components/ui/Skeleton";
import { detectIdioms } from "@/lib/ai/actions";
import type { CefrLevel, Idiom, TargetDialect } from "@/lib/ai/schemas";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; idioms: Idiom[] }
  | { status: "error"; message: string };

export function IdiomsPanel({
  mediaId,
  positionMs,
  cefr,
  dialect,
}: {
  mediaId: string;
  positionMs: number;
  cefr: CefrLevel;
  dialect: TargetDialect;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function scan() {
    setState({ status: "loading" });
    const res = await detectIdioms({ mediaId, positionMs, cefr, dialect });
    if (res.ok) setState({ status: "ready", idioms: res.idioms });
    else setState({ status: "error", message: res.error });
  }

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm text-muted">
        Scan the subtitles around your playback position (~±90s) for idioms and fixed
        expressions natives use without thinking.
      </p>
      <Button size="sm" onClick={scan} disabled={state.status === "loading"} className="mt-3 self-start">
        {state.status === "loading" ? "Scanning…" : "✦ Scan this scene"}
      </Button>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {state.status === "loading" ? <TextSkeleton lines={6} /> : null}
        {state.status === "error" ? <p className="text-sm text-danger">{state.message}</p> : null}
        {state.status === "ready" && state.idioms.length === 0 ? (
          <p className="text-sm text-muted">No idioms in this scene — it&apos;s all literal.</p>
        ) : null}
        {state.status === "ready"
          ? state.idioms.map((idiom) => (
              <div key={idiom.phrase} className="rounded-xl border border-border bg-white/[0.03] p-3">
                <p className="text-sm font-semibold text-accent">„{idiom.phrase}“</p>
                <p className="mt-1 text-sm text-foreground/90">{idiom.meaning}</p>
                <p className="mt-1 text-[13px] text-muted">
                  Literally: <em>{idiom.literal}</em>
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{idiom.register}</p>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
