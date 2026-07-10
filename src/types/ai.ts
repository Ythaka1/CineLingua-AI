/**
 * Public AI-contract types, re-exported from the Zod schemas so client
 * components can import types without pulling in server-only modules.
 */
export type {
  AiMode,
  CefrLevel,
  ChatMessage,
  Example,
  ExplainSentenceInput,
  ExplainWordInput,
  MovieChatInput,
  PartOfSpeech,
  SentenceExplanation,
  SentenceSection,
  TargetDialect,
  WordExplanation,
} from "@/lib/ai/schemas";
