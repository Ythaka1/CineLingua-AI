"use client";

import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { deleteMedia } from "@/lib/actions/media";
import { deleteVideo } from "@/lib/video-store";

export interface MediaItem {
  id: string;
  title: string;
  durationMs: number | null;
  posterUrl: string | null;
  positionMs: number;
}

export function MediaGrid({ items }: { items: MediaItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🎬"
        title="No movies yet"
        description="Import your first film above — the moment it loads, every word of the German subtitles becomes clickable."
      />
    );
  }

  async function remove(id: string) {
    if (!confirm("Remove this title and its subtitles? Saved words stay.")) return;
    await deleteVideo(id);
    await deleteMedia(id);
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((m) => {
        const pct =
          m.durationMs && m.durationMs > 0
            ? Math.min(100, (m.positionMs / m.durationMs) * 100)
            : 0;
        return (
          <div key={m.id} className="group relative">
            <Link
              href={`/watch/${m.id}`}
              className="block overflow-hidden rounded-2xl border border-border bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="relative aspect-video bg-elevated">
                {m.posterUrl ? (
                  // Data-URI poster generated at import time
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.posterUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl opacity-40">
                    🎬
                  </div>
                )}
                {pct > 0 ? (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {m.durationMs ? `${Math.round(m.durationMs / 60000)} min` : "—"}
                  {pct > 0 ? ` · ${Math.round(pct)}% watched` : ""}
                </p>
              </div>
            </Link>
            <button
              onClick={() => void remove(m.id)}
              aria-label={`Remove ${m.title}`}
              className="absolute top-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:text-danger"
            >
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
}
