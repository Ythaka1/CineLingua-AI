import { z } from "zod";

/**
 * The AI contract — the spine of the product.
 *
 * Every AI surface validates model output against these schemas at the
 * boundary. Server actions (Phase 1) return `z.infer` types, never free
 * text, except where the contract is explicitly streamed markdown.
 */

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const targetDialectSchema = z.enum(["DE", "AT", "CH"]);
export type TargetDialect = z.infer<typeof targetDialectSchema>;

/** Each mode maps to a system-prompt fragment (Phase 1: src/lib/ai/prompts). */
export const aiModeSchema = z.enum([
  "Translator",
  "GrammarTeacher",
  "NativeFriend",
  "ExamCoach", // frames explanations against telc/Goethe B2 criteria — first-class
  "ConversationPartner",
  "CultureGuide",
]);
export type AiMode = z.infer<typeof aiModeSchema>;

export const partOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "particle", // doch, eben, halt — Modalpartikeln are first-class citizens here
  "interjection",
  "article",
  "numeral",
  "phrase",
]);
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

// ---------------------------------------------------------------------------
// explainWord — small + deterministic + cacheable → typed JSON, non-streaming
// ---------------------------------------------------------------------------

export const explainWordInputSchema = z.object({
  /** The clicked surface form, e.g. "ging". */
  word: z.string().min(1).max(80),
  /** The full subtitle sentence the word appeared in. */
  context: z.string().min(1).max(500),
  cefr: cefrLevelSchema,
  mode: aiModeSchema,
  dialect: targetDialectSchema,
});
export type ExplainWordInput = z.infer<typeof explainWordInputSchema>;

const exampleSchema = z.object({
  de: z.string(),
  en: z.string(),
});
export type Example = z.infer<typeof exampleSchema>;

export const wordExplanationSchema = z.object({
  /** Dictionary form, e.g. "gehen" for "ging". */
  lemma: z.string(),
  /** Meaning as used in THIS context, in English. */
  meaning: z.string(),
  ipa: z.string().nullable(),
  cefr: cefrLevelSchema,
  pos: partOfSpeechSchema,
  /** Nouns only. */
  gender: z.enum(["der", "die", "das"]).nullable(),
  /** Nouns only, e.g. "die Häuser". */
  plural: z.string().nullable(),
  /** Verbs only: 3rd-person präsens, präteritum, perfekt — e.g. "geht · ging · ist gegangen". */
  conjugation: z.string().nullable(),
  /** Common word partners, e.g. "eine Entscheidung treffen". */
  collocations: z.array(z.string()).max(6),
  synonyms: z.array(z.string()).max(6),
  antonyms: z.array(z.string()).max(6),
  examples: z.array(exampleSchema).min(1).max(3),
  /** What learners typically get wrong with this word. */
  commonMistake: z.string(),
  /** A memorable hook — mnemonic, cognate, or image. */
  memoryTip: z.string(),
});
export type WordExplanation = z.infer<typeof wordExplanationSchema>;

// ---------------------------------------------------------------------------
// explainSentence — streamed markdown in fixed sections; final result cached
// ---------------------------------------------------------------------------

export const explainSentenceInputSchema = z.object({
  /** The full subtitle cue / sentence. */
  sentence: z.string().min(1).max(1000),
  /** Neighbouring cues for context (a few before/after), optional. */
  context: z.string().max(2000).optional(),
  cefr: cefrLevelSchema,
  mode: aiModeSchema,
  dialect: targetDialectSchema,
});
export type ExplainSentenceInput = z.infer<typeof explainSentenceInputSchema>;

/**
 * The fixed `##` section headings of a sentence explanation, in order.
 * The prompt instructs the model to emit exactly these; the UI renders the
 * stream as it arrives and can split on them for progressive layout.
 */
export const SENTENCE_SECTIONS = [
  "Natural translation",
  "Literal translation",
  "Grammar & word order",
  "Register",
  "Idioms & fixed expressions",
  "How Germans actually say it",
  "More natural alternatives",
  "Learner mistakes",
] as const;
export type SentenceSection = (typeof SENTENCE_SECTIONS)[number];

/** The cached, post-stream result. */
export const sentenceExplanationSchema = z.object({
  markdown: z.string().min(1),
});
export type SentenceExplanation = z.infer<typeof sentenceExplanationSchema>;

// ---------------------------------------------------------------------------
// Idiom detection — a pass over a scene's cues (Phase 5, honest version)
// ---------------------------------------------------------------------------

export const idiomSchema = z.object({
  /** The idiom or fixed expression exactly as it appears in the subtitles. */
  phrase: z.string(),
  /** What it actually means in English. */
  meaning: z.string(),
  /** Word-for-word translation, so the learner sees why it's opaque. */
  literal: z.string(),
  /** Register / who uses it. */
  register: z.string(),
});
export type Idiom = z.infer<typeof idiomSchema>;

export const idiomListSchema = z.object({
  idioms: z.array(idiomSchema).max(12),
});
export type IdiomList = z.infer<typeof idiomListSchema>;

// ---------------------------------------------------------------------------
// Movie chat — streaming conversation with the film's cues as context
// ---------------------------------------------------------------------------

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const movieChatInputSchema = z.object({
  mediaId: z.string().uuid(),
  /** Player position, used to pull the surrounding cues server-side. */
  positionMs: z.number().int().nonnegative(),
  messages: z.array(chatMessageSchema).min(1).max(40),
  cefr: cefrLevelSchema,
  mode: aiModeSchema,
  dialect: targetDialectSchema,
});
export type MovieChatInput = z.infer<typeof movieChatInputSchema>;
