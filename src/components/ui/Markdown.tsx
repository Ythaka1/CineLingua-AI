import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for the AI's constrained output (## headings,
 * bullets, **bold**, *italic*, `code`). Builds React nodes directly — no
 * HTML injection, no dependency. Not a general-purpose renderer.
 */

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // bold / italic / inline code
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index;
    if (start > last) nodes.push(text.slice(last, start));
    const token = m[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: ReactNode[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="mb-3 space-y-1.5 pl-1">
        {bullets}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l${idx}`;
    if (/^##\s+/.test(line)) {
      flushBullets(`${key}-ul`);
      blocks.push(
        <h3
          key={key}
          className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase first:mt-0"
        >
          {line.replace(/^##\s+/, "")}
        </h3>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      bullets.push(
        <li key={key} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
          <span>{renderInline(line.replace(/^[-*]\s+/, ""), key)}</span>
        </li>,
      );
    } else if (line.trim().length > 0) {
      flushBullets(`${key}-ul`);
      blocks.push(
        <p key={key} className="mb-3 text-sm leading-relaxed text-foreground/90">
          {renderInline(line, key)}
        </p>,
      );
    }
  });
  flushBullets("tail-ul");

  return <div>{blocks}</div>;
}
