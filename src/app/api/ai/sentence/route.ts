import { buildCacheKey } from "@/lib/ai/cache-key";
import { cacheGet, cachePut } from "@/lib/ai/cache";
import { AI_MODEL, getGemini } from "@/lib/ai/gemini";
import { sentenceSystemPrompt, sentenceUserPrompt } from "@/lib/ai/prompts";
import {
  explainSentenceInputSchema,
  sentenceExplanationSchema,
} from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Sentence panel: streams markdown in fixed sections; the final result is
 * cached so replaying the same sentence at the same level is free.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = explainSentenceInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const key = buildCacheKey({
    kind: "sentence",
    input: input.sentence,
    mode: input.mode,
    cefr: input.cefr,
    dialect: input.dialect,
  });

  const hit = await cacheGet(supabase, key);
  if (hit !== null) {
    const cached = sentenceExplanationSchema.safeParse(hit);
    if (cached.success) {
      return new Response(cached.data.markdown, {
        headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Cache": "HIT" },
      });
    }
  }

  const gemini = getGemini();
  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const responseStream = await gemini.models.generateContentStream({
          model: AI_MODEL,
          contents: sentenceUserPrompt(input),
          config: {
            systemInstruction: sentenceSystemPrompt(input),
            maxOutputTokens: 4096,
          },
        });
        for await (const chunk of responseStream) {
          const delta = chunk.text;
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
        if (full.trim().length > 0) {
          await cachePut(supabase, key, { markdown: full });
        }
        controller.close();
      } catch (err) {
        console.error("[ai] explainSentence stream failed:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Cache": "MISS" },
  });
}
