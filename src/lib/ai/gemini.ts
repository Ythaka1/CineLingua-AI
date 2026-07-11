import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

/** All AI surfaces run on the same model; change here to swap. */
export const AI_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (server-side only).",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** JSON schema for responseJsonSchema — Gemini rejects the $schema meta key. */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Gemini sometimes wraps JSON in ``` fences despite the JSON mime type. */
export function parseJsonResponse(text: string | undefined): unknown {
  if (!text) throw new Error("Empty model response");
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return JSON.parse(cleaned);
}
