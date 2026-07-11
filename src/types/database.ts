/**
 * Hand-maintained Supabase schema types (mirrors supabase/migrations/).
 * Regenerate with `supabase gen types typescript` once a CI step exists;
 * until then, keep in sync with the SQL by hand.
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type TargetDialect = "DE" | "AT" | "CH";
export type SubtitleLang = "de" | "en";

export type ProfileRow = {
  id: string;
  cefr_level: CefrLevel;
  target_dialect: TargetDialect;
  daily_goal_minutes: number;
  streak: number;
  created_at: string;
  updated_at: string;
}

export type MediaRow = {
  id: string;
  user_id: string;
  title: string;
  duration_ms: number | null;
  poster_url: string | null;
  source_type: "local";
  created_at: string;
}

export type SubtitleCueRow = {
  id: number;
  media_id: string;
  lang: SubtitleLang;
  cue_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export type SavedWordRow = {
  id: string;
  user_id: string;
  lemma: string;
  surface: string;
  translation: string;
  cefr: CefrLevel | null;
  pos: string | null;
  gender: "der" | "die" | "das" | null;
  plural: string | null;
  ipa: string | null;
  example: string | null;
  tags: string[];
  media_id: string | null;
  cue_id: number | null;
  next_review: string;
  interval_days: number;
  ease: number;
  created_at: string;
}

export type SavedSentenceRow = {
  id: string;
  user_id: string;
  text: string;
  translation: string;
  explanation_md: string | null;
  tags: string[];
  media_id: string | null;
  cue_id: number | null;
  next_review: string;
  interval_days: number;
  ease: number;
  created_at: string;
}

export type WatchProgressRow = {
  user_id: string;
  media_id: string;
  position_ms: number;
  updated_at: string;
}

export type DailyActivityRow = {
  user_id: string;
  day: string;
  seconds: number;
}

export type AiCacheRow = {
  key: string;
  payload: unknown;
  created_at: string;
}

type TableDef<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Partial<Omit<ProfileRow, "id">> & { id: string }
      >;
      media: TableDef<
        MediaRow,
        Omit<MediaRow, "id" | "created_at" | "source_type"> &
          Partial<Pick<MediaRow, "id" | "source_type">>
      >;
      subtitle_cues: TableDef<SubtitleCueRow, Omit<SubtitleCueRow, "id">>;
      saved_words: TableDef<
        SavedWordRow,
        Omit<
          SavedWordRow,
          "id" | "created_at" | "next_review" | "interval_days" | "ease" | "tags"
        > &
          Partial<
            Pick<SavedWordRow, "tags" | "next_review" | "interval_days" | "ease">
          >
      >;
      saved_sentences: TableDef<
        SavedSentenceRow,
        Omit<
          SavedSentenceRow,
          "id" | "created_at" | "next_review" | "interval_days" | "ease" | "tags"
        > &
          Partial<
            Pick<
              SavedSentenceRow,
              "tags" | "next_review" | "interval_days" | "ease"
            >
          >
      >;
      watch_progress: TableDef<
        WatchProgressRow,
        Omit<WatchProgressRow, "updated_at"> &
          Partial<Pick<WatchProgressRow, "updated_at">>
      >;
      daily_activity: TableDef<DailyActivityRow, DailyActivityRow>;
      ai_cache: TableDef<
        AiCacheRow,
        Omit<AiCacheRow, "created_at"> & Partial<Pick<AiCacheRow, "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      add_activity: { Args: { p_seconds: number }; Returns: undefined };
    };
    Enums: {
      cefr_level: CefrLevel;
      target_dialect: TargetDialect;
      subtitle_lang: SubtitleLang;
    };
    CompositeTypes: Record<string, never>;
  };
}
