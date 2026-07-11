import { AI_MODEL, getAnthropic } from "@/lib/ai/anthropic";
import { chatSystemPrompt } from "@/lib/ai/prompts";
import { movieChatInputSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Window of subtitles injected as scene context around the playhead. */
const CONTEXT_WINDOW_MS = 60_000;

/**
 * Movie chat: streaming conversation with the film's surrounding cues
 * injected server-side (the client never assembles the context).
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = movieChatInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  // RLS scopes both queries to the caller's own media.
  const { data: media } = await supabase
    .from("media")
    .select("title")
    .eq("id", input.mediaId)
    .maybeSingle();
  if (!media) return Response.json({ error: "Media not found." }, { status: 404 });

  const { data: cues } = await supabase
    .from("subtitle_cues")
    .select("start_ms, text")
    .eq("media_id", input.mediaId)
    .eq("lang", "de")
    .gte("start_ms", Math.max(0, input.positionMs - CONTEXT_WINDOW_MS))
    .lte("start_ms", input.positionMs + CONTEXT_WINDOW_MS)
    .order("start_ms")
    .limit(60);

  const surroundingCues = (cues ?? [])
    .map((c) => {
      const s = Math.floor(c.start_ms / 1000);
      const stamp = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      return `[${stamp}] ${c.text.replace(/\n/g, " ")}`;
    })
    .join("\n");

  const encoder = new TextEncoder();
  const anthropic = getAnthropic();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = anthropic.messages.stream({
          model: AI_MODEL,
          max_tokens: 1500,
          system: chatSystemPrompt({
            cefr: input.cefr,
            mode: input.mode,
            dialect: input.dialect,
            mediaTitle: media.title,
            surroundingCues,
          }),
          messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        });
        messageStream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        console.error("[ai] chat stream failed:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
