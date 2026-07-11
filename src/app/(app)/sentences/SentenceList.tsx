"use client";

import { useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Markdown } from "@/components/ui/Markdown";
import { Tag } from "@/components/ui/Tag";
import { deleteSavedSentence } from "@/lib/actions/saved";

export interface SentenceItem {
  id: string;
  text: string;
  translation: string;
  explanation_md: string | null;
  tags: string[];
  created_at: string;
}

export function SentenceList({ sentences }: { sentences: SentenceItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = sentences.filter((s) => !removed.has(s.id));

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="❝"
        title="No sentences yet"
        description="While watching, press E (or click ✦ on a subtitle) and save the breakdown — it lands here for review."
      />
    );
  }

  async function remove(id: string) {
    setRemoved((prev) => new Set(prev).add(id));
    await deleteSavedSentence(id);
  }

  return (
    <ul className="space-y-3">
      {visible.map((s) => (
        <li key={s.id} className="group rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => setOpen(open === s.id ? null : s.id)}
              className="min-w-0 flex-1 text-left"
              aria-expanded={open === s.id}
            >
              <p className="text-[15px] leading-snug font-medium">„{s.text}“</p>
              <p className="mt-1 text-sm text-muted">{s.translation}</p>
              <div className="mt-2 flex gap-1.5">
                {s.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </button>
            <button
              onClick={() => void remove(s.id)}
              aria-label="Delete sentence"
              className="text-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
            >
              ✕
            </button>
          </div>

          {open === s.id && s.explanation_md ? (
            <div className="mt-4 border-t border-border pt-4">
              <Markdown text={s.explanation_md} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
