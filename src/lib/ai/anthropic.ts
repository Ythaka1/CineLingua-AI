import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/** All AI surfaces run on the same model; change here to swap. */
export const AI_MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (server-side only).",
    );
  }
  client ??= new Anthropic();
  return client;
}
