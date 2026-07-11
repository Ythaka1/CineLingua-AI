"use client";

import { useEffect, useState } from "react";

import { aiModeSchema, type AiMode } from "@/lib/ai/schemas";

const STORAGE_KEY = "cinelingua.aiMode";

/** The active AI mode, persisted locally (per device, instant to switch). */
export function useAiMode(): [AiMode, (mode: AiMode) => void] {
  const [mode, setMode] = useState<AiMode>("GrammarTeacher");

  useEffect(() => {
    const stored = aiModeSchema.safeParse(localStorage.getItem(STORAGE_KEY));
    if (stored.success) setMode(stored.data);
  }, []);

  const update = (next: AiMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  };
  return [mode, update];
}
