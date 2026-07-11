"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Tag } from "@/components/ui/Tag";
import { deleteSavedWord } from "@/lib/actions/saved";

export interface WordItem {
  id: string;
  lemma: string;
  surface: string;
  translation: string;
  cefr: string | null;
  pos: string | null;
  gender: string | null;
  plural: string | null;
  ipa: string | null;
  example: string | null;
  tags: string[];
  next_review: string;
  created_at: string;
}

/** Anki-importable TSV: front, back, extra (File → Import, fields separated by tabs). */
function exportAnki(words: WordItem[]) {
  const rows = words.map((w) => {
    const front = w.gender ? `${w.gender} ${w.lemma}` : w.lemma;
    const back = w.translation;
    const extra = [
      w.plural ? `Plural: ${w.plural}` : null,
      w.ipa ? `IPA: /${w.ipa}/` : null,
      w.example,
    ]
      .filter(Boolean)
      .join(" — ");
    const esc = (s: string) => s.replace(/\t/g, " ").replace(/\n/g, " ");
    return [esc(front), esc(back), esc(extra)].join("\t");
  });
  const blob = new Blob([rows.join("\n")], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cinelingua-vocabulary.tsv";
  a.click();
  URL.revokeObjectURL(url);
}

export function VocabularyList({ words }: { words: WordItem[] }) {
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter(
      (w) =>
        !removed.has(w.id) &&
        (q === "" ||
          w.lemma.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }, [words, query, removed]);

  if (words.length === 0) {
    return (
      <EmptyState
        icon="🗂"
        title="Nothing saved yet"
        description="While watching, click any German word and hit “Save word”. It lands here with its gender, plural, examples and a memory tip."
      />
    );
  }

  async function remove(id: string) {
    setRemoved((prev) => new Set(prev).add(id));
    await deleteSavedWord(id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lemma, meaning, tag…"
          aria-label="Search vocabulary"
          className="max-w-xs"
        />
        <span className="text-sm text-muted">{visible.length} words</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => exportAnki(visible)}>
          ⇩ Export for Anki (.tsv)
        </Button>
      </div>

      <ul className="space-y-2">
        {visible.map((w) => (
          <li
            key={w.id}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[15px] font-semibold">
                  {w.gender ? <span className="text-accent">{w.gender} </span> : null}
                  {w.lemma}
                </span>
                {w.ipa ? <span className="text-xs text-muted">/{w.ipa}/</span> : null}
                {w.cefr ? <Tag tone="accent">{w.cefr}</Tag> : null}
                {w.pos ? <Tag>{w.pos}</Tag> : null}
              </div>
              <p className="mt-1 text-sm text-foreground/85">{w.translation}</p>
              {w.example ? (
                <p className="mt-1 truncate text-[13px] text-muted">{w.example}</p>
              ) : null}
            </div>
            <button
              onClick={() => void remove(w.id)}
              aria-label={`Delete ${w.lemma}`}
              className="text-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
