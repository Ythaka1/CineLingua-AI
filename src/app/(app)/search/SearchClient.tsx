"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { TextSkeleton } from "@/components/ui/Skeleton";
import { searchCues, type CueHit } from "@/lib/actions/search";

/** Grammar presets = the trigger word-forms we can honestly match with regex. */
const PRESETS: { label: string; terms: string[]; note: string }[] = [
  { label: "obwohl", terms: ["obwohl"], note: "concessive clauses" },
  {
    label: "Konjunktiv II",
    terms: ["würde", "würden", "würdest", "hätte", "hätten", "wäre", "wären", "könnte", "könnten", "müsste", "sollte"],
    note: "matches common KII forms",
  },
  {
    label: "Passiv",
    terms: ["wird", "wurde", "wurden", "worden"],
    note: "matches werden-auxiliaries",
  },
  {
    label: "doch / eben / halt",
    terms: ["doch", "eben", "halt"],
    note: "Modalpartikeln",
  },
];

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const re = new RegExp(
    `\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "gi",
  );
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) && terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-accent">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; hits: CueHit[]; terms: string[] }
  | { status: "error"; message: string };

export function SearchClient({ media }: { media: { id: string; title: string }[] }) {
  const [query, setQuery] = useState("");
  const [mediaId, setMediaId] = useState<string>("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function run(terms: string[]) {
    if (terms.length === 0) return;
    setState({ status: "loading" });
    const res = await searchCues({ terms, mediaId: mediaId || null });
    if (res.ok) setState({ status: "ready", hits: res.hits, terms });
    else setState({ status: "error", message: res.error });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query.trim().split(/\s+/).filter(Boolean).slice(0, 5));
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a word, e.g. trotzdem"
          aria-label="Search subtitles"
          className="max-w-xs"
        />
        <Select
          value={mediaId}
          onChange={(e) => setMediaId(e.target.value)}
          aria-label="Limit to one title"
          className="max-w-[220px]"
        >
          <option value="">All titles</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={query.trim().length === 0}>
          Search
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => void run(p.terms)}
            title={p.note}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground/85 transition-colors hover:border-accent/40 hover:bg-accent-soft"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {state.status === "loading" ? <TextSkeleton lines={6} /> : null}
        {state.status === "error" ? (
          <p className="text-sm text-danger">{state.message}</p>
        ) : null}
        {state.status === "ready" && state.hits.length === 0 ? (
          <EmptyState
            icon="⌕"
            title="No matches"
            description="Nothing in your imported subtitles matches that — try another form or import more content."
          />
        ) : null}
        {state.status === "ready" && state.hits.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-muted">
              {state.hits.length} line{state.hits.length === 1 ? "" : "s"}
              {state.hits.length === 150 ? " (first 150)" : ""}
            </p>
            <ul className="space-y-2">
              {state.hits.map((hit, i) => (
                <li key={i}>
                  <Link
                    href={`/watch/${hit.mediaId}`}
                    className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/40"
                  >
                    <p className="text-sm leading-relaxed">
                      <Highlighted text={hit.text} terms={state.terms} />
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {hit.mediaTitle} · {fmt(hit.startMs)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {state.status === "idle" ? (
          <p className="text-sm text-muted">
            Tip: the presets match surface forms (e.g. <em>würde, hätte, wäre…</em> for
            Konjunktiv II) — honest regex, not magic parsing.
          </p>
        ) : null}
      </div>
    </div>
  );
}
