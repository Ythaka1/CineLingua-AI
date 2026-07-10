/**
 * CineLingua AI — design tokens.
 *
 * Single source of truth for the visual language. The same values are
 * mirrored into Tailwind's theme in `src/app/globals.css` (@theme block);
 * if a value changes here, change it there too.
 *
 * Reference feel: Apple TV × Arc × Linear × Notion AI — dark, spacious,
 * glassmorphic where it earns it, cinematic without being gaudy.
 */

export const colors = {
  /** App background — near-black with a cool tint. */
  background: "#0A0A0C",
  /** Resting surface: cards, panels, rails. */
  surface: "#141418",
  /** Elevated surface: popovers, floating AI cards, modals. */
  elevated: "#1C1C22",
  /** Primary text. */
  foreground: "#F5F5F7",
  /** Secondary text: labels, EN subtitle line, metadata. */
  muted: "#A1A1AA",
  /** Hairline borders on panels and glass edges. */
  border: "rgba(255, 255, 255, 0.08)",
  /** Accent — soft cinematic violet. Interactive highlights, active states. */
  accent: "#7C6FF0",
  /** Accent at low alpha — hover washes, selected-word highlight. */
  accentSoft: "rgba(124, 111, 240, 0.16)",
  /** Semantic states (AI error surfaces, SRS grading). */
  danger: "#F2555A",
  success: "#4ADE80",
} as const;

export const radii = {
  /** Panels, cards, video chrome — rounded-2xl. */
  panel: "1rem",
  /** Small controls: buttons, badges, chips. */
  control: "0.625rem",
  full: "9999px",
} as const;

/** Motion: smooth and quick, never bouncy-for-the-sake-of-it. */
export const motion = {
  duration: {
    /** Hovers, small state changes. */
    fast: 0.15,
    /** Most enters/exits: cards, panels. */
    base: 0.2,
    /** Larger surfaces: side panel, modal. */
    slow: 0.25,
  },
  /** Default ease for enters and layout shifts (Apple-style decel). */
  ease: [0.32, 0.72, 0, 1] as const,
} as const;

export const blur = {
  /** Backdrop blur for floating glass surfaces (AI cards, overlays). */
  glass: "20px",
} as const;

/** Subtitle overlay type scale (player is the hero surface). */
export const subtitles = {
  /** German cue — prominent. */
  de: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "0.01em" },
  /** English cue — muted, beneath the German line. */
  en: { fontSize: "1.0625rem", fontWeight: 400, letterSpacing: "0.005em" },
} as const;

export const tokens = { colors, radii, motion, blur, subtitles } as const;
export type Tokens = typeof tokens;
