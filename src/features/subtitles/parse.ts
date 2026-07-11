import type { ParsedCue } from "./types";

/**
 * Parses .srt and .vtt subtitle files into cues with millisecond timings.
 * Tolerant of BOMs, CRLF, missing indices, and VTT cue settings; strips
 * inline markup tags (<i>, <b>, <c.color>, {\an8}, …).
 */
export function parseSubtitles(fileName: string, content: string): ParsedCue[] {
  const text = content.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const isVtt = /\.vtt$/i.test(fileName) || text.trimStart().startsWith("WEBVTT");
  return isVtt ? parseVtt(text) : parseSrt(text);
}

// 00:00:01,500 / 00:00:01.500 / 00:01.500 (VTT short form)
const TIME_RE = /(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})/;

function parseTime(raw: string): number | null {
  const m = TIME_RE.exec(raw.trim());
  if (!m) return null;
  const [, h, min, s, ms] = m;
  return (
    (h ? parseInt(h, 10) : 0) * 3_600_000 +
    parseInt(min, 10) * 60_000 +
    parseInt(s, 10) * 1000 +
    parseInt(ms.padEnd(3, "0"), 10)
  );
}

function cleanText(lines: string[]): string {
  return lines
    .join("\n")
    .replace(/<[^>\n]+>/g, "") // <i>, <b>, <c.yellow>, <00:00:01.000>
    .replace(/\{\\?[^}\n]*\}/g, "") // {\an8} and ASS-style tags
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseBlocks(blocks: string[][]): ParsedCue[] {
  const cues: ParsedCue[] = [];
  for (const block of blocks) {
    const timeLineIdx = block.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;
    const [startRaw, endRaw] = block[timeLineIdx].split("-->");
    const startMs = parseTime(startRaw);
    const endMs = parseTime(endRaw);
    if (startMs === null || endMs === null || endMs <= startMs) continue;
    const text = cleanText(block.slice(timeLineIdx + 1));
    if (!text) continue;
    cues.push({ index: cues.length, startMs, endMs, text });
  }
  return cues;
}

function parseSrt(text: string): ParsedCue[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").filter((l) => l.trim().length > 0))
    .filter((b) => b.length > 0);
  return parseBlocks(blocks);
}

function parseVtt(text: string): ParsedCue[] {
  const body = text.replace(/^WEBVTT[^\n]*\n/, "");
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").filter((l) => l.trim().length > 0))
    // Drop NOTE / STYLE / REGION blocks
    .filter(
      (b) => b.length > 0 && !/^(NOTE|STYLE|REGION)\b/.test(b[0]),
    );
  return parseBlocks(blocks);
}
