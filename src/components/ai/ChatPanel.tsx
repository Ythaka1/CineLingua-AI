"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import type { AiMode, CefrLevel, ChatMessage, TargetDialect } from "@/lib/ai/schemas";
import { streamText } from "@/lib/ai/stream-client";

const SUGGESTIONS = [
  "Why did they phrase it like that?",
  "Is this line funny? Why?",
  "Would young people say this?",
  "Is this Austrian / regional German?",
];

export function ChatPanel({
  mediaId,
  positionMs,
  cefr,
  dialect,
  mode,
}: {
  mediaId: string;
  positionMs: number;
  cefr: CefrLevel;
  dialect: TargetDialect;
  mode: AiMode;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      await streamText(
        "/api/ai/chat",
        { mediaId, positionMs, messages: next.slice(-20), cefr, mode, dialect },
        (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
            return copy;
          });
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
      setMessages(next); // drop the empty assistant bubble
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted">
              Ask about the current scene — the tutor can see the subtitles around your
              playback position.
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="block w-full rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-left text-[13px] text-foreground/85 transition-colors hover:border-accent/40 hover:bg-accent-soft"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl rounded-br-md bg-accent-soft px-3 py-2 text-sm"
                : "mr-4 text-sm"
            }
          >
            {m.role === "assistant" ? (
              m.content ? (
                <Markdown text={m.content} />
              ) : (
                <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent" />
              )
            ) : (
              m.content
            )}
          </div>
        ))}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-3 flex gap-2 border-t border-border pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this scene…"
          aria-label="Chat message"
          className="h-9 min-w-0 flex-1 rounded-[--radius-control] border border-border bg-surface px-3 text-sm placeholder:text-muted/60 focus:border-accent/60 focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={streaming || input.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  );
}
