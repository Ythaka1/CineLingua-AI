export interface ParsedCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** A cue as loaded from the database for playback. */
export interface Cue {
  id: number;
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export type SubtitleMode = "both" | "de" | "en" | "off";
