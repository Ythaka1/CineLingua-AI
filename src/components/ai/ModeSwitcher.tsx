"use client";

import { aiModeSchema, type AiMode } from "@/lib/ai/schemas";

const LABELS: Record<AiMode, string> = {
  Translator: "Translator",
  GrammarTeacher: "Grammar teacher",
  NativeFriend: "Native friend",
  ExamCoach: "Exam coach (B2)",
  ConversationPartner: "Conversation partner",
  CultureGuide: "Culture guide",
};

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: AiMode;
  onChange: (mode: AiMode) => void;
}) {
  return (
    <select
      value={mode}
      onChange={(e) => {
        const parsed = aiModeSchema.safeParse(e.target.value);
        if (parsed.success) onChange(parsed.data);
      }}
      aria-label="AI tutor mode"
      className="h-8 cursor-pointer rounded-lg border border-border bg-elevated px-2 text-[13px] font-medium text-foreground focus:border-accent/60 focus:outline-none"
    >
      {aiModeSchema.options.map((m) => (
        <option key={m} value={m}>
          {LABELS[m]}
        </option>
      ))}
    </select>
  );
}
