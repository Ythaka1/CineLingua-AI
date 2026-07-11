import "server-only";

import {
  SENTENCE_SECTIONS,
  type AiMode,
  type CefrLevel,
  type ExplainSentenceInput,
  type ExplainWordInput,
  type TargetDialect,
} from "@/lib/ai/schemas";

/** Each AI mode is a system-prompt fragment layered onto the base tutor. */
export const MODE_PROMPTS: Record<AiMode, string> = {
  Translator:
    "Mode: Translator. Prioritize precise, natural translation. Give the closest English equivalent first, then the literal meaning where they differ.",
  GrammarTeacher:
    "Mode: Grammar teacher. Name the grammatical structures explicitly (case, Konjunktiv, word order, verb position) and explain WHY the sentence is built this way. Assume the learner wants the rule, not just the answer.",
  NativeFriend:
    "Mode: Native friend. Explain like a German friend over a beer — casual register, slang, what people actually say, what would sound stiff or textbook. Be direct about what sounds unnatural.",
  ExamCoach:
    "Mode: Exam coach (telc / Goethe B2). Frame every explanation against B2 exam criteria: is this structure expected at B2? Would using it in the spoken or written exam earn points? Point out structures the learner should actively produce, and typical exam-relevant traps. This learner is preparing for a real B2 exam — treat that goal as first-class.",
  ConversationPartner:
    "Mode: Conversation partner. Keep explanations brief and practical, then offer a short follow-up question in German the learner could answer to practice.",
  CultureGuide:
    "Mode: Culture guide. Emphasize cultural context: why Germans phrase it this way, regional differences (DE/AT/CH), politeness norms, humor, and what a native infers between the lines.",
};

function baseSystem(cefr: CefrLevel, mode: AiMode, dialect: TargetDialect): string {
  const dialectName =
    dialect === "AT" ? "Austrian German" : dialect === "CH" ? "Swiss Standard German" : "German (Germany)";
  return [
    "You are the AI tutor inside CineLingua, an app where learners watch German film and TV with subtitles and click anything they don't understand.",
    `The learner's level is ${cefr}. They want to understand German the way natives mean it — register, nuance, and how Germans actually phrase things — not just literal translation.`,
    `Target variety: ${dialectName}. Note dialect-specific usage when it matters.`,
    MODE_PROMPTS[mode],
  ].join("\n\n");
}

export function wordSystemPrompt(input: ExplainWordInput): string {
  return [
    baseSystem(input.cefr, input.mode, input.dialect),
    "The learner clicked a single word in a subtitle. Explain it as used in THIS sentence — pick the contextual sense, not the dictionary's first sense.",
    "Field rules: `gender` and `plural` only for nouns (null otherwise). `conjugation` only for verbs, formatted '3rd sg präsens · präteritum · perfekt' e.g. 'geht · ging · ist gegangen' (null otherwise). `ipa` for the lemma. Keep `meaning` under 20 words. Examples must be natural spoken German at or slightly above the learner's level.",
  ].join("\n\n");
}

export function wordUserPrompt(input: ExplainWordInput): string {
  return `Word: "${input.word}"\nSubtitle sentence: "${input.context}"`;
}

export function sentenceSystemPrompt(input: ExplainSentenceInput): string {
  const sections = SENTENCE_SECTIONS.map((s) => `## ${s}`).join("\n");
  return [
    baseSystem(input.cefr, input.mode, input.dialect),
    "The learner clicked a whole subtitle line. Produce a markdown explanation with EXACTLY these ## sections, in this order, no preamble before the first heading and nothing after the last section:",
    sections,
    'Section guidance: "Natural translation" is one line — what an English subtitle would say. "Literal translation" is word-for-word, showing the German skeleton. "Grammar & word order" names the structures. "Register" says who talks like this and when. "Idioms & fixed expressions" — write "None in this line." if there are none. "How Germans actually say it" teaches the phrasing pattern natives reach for. "More natural alternatives" gives one formal, one casual, one business variant as a bullet list. "Learner mistakes" lists 1–3 things learners at this level typically get wrong here. Keep the whole thing tight — no filler.',
  ].join("\n\n");
}

export function sentenceUserPrompt(input: ExplainSentenceInput): string {
  const context = input.context ? `\nSurrounding subtitles for context:\n${input.context}` : "";
  return `Sentence: "${input.sentence}"${context}`;
}

export function chatSystemPrompt(params: {
  cefr: CefrLevel;
  mode: AiMode;
  dialect: TargetDialect;
  mediaTitle: string;
  surroundingCues: string;
}): string {
  return [
    baseSystem(params.cefr, params.mode, params.dialect),
    `The learner is watching "${params.mediaTitle}" and is chatting with you about the current scene. Typical questions: why a character said something, why a line is funny, whether young people talk like this, whether it's Austrian/Swiss usage.`,
    "Subtitles around the current playback position (their live context — quote from these when relevant):",
    params.surroundingCues || "(no subtitles near this position)",
    "Answer in English unless asked otherwise; quote German exactly as written. Be concrete and scene-specific, not generic.",
  ].join("\n\n");
}
