# CineLingua AI

Learn German naturally by watching movies and shows with an AI tutor.

Not a subtitle translator — an immersive tutor for B2/C1 learners. The core
loop: **watch → click a word or sentence → get an AI explanation that teaches
register, nuance, and how Germans actually phrase it → save it → review it.**

## Stack

- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Motion
- Supabase (Postgres + Auth) — migrations in `supabase/migrations/`, RLS on everything user-owned
- Google Gemini 2.5 Flash (official `@google/genai` SDK), server-side only, Zod-validated at every boundary
- HTML5 video + user-supplied local files with imported `.srt`/`.vtt` subtitles (v1)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys + GEMINI_API_KEY
npm run dev
```

Apply the SQL in `supabase/migrations/` to your Supabase project
(`supabase db push` or the SQL editor).

## Where things live

```
src/
  app/                  # routes, layouts, route handlers
  components/
    player/             # video, controls, subtitle overlay
    ai/                 # word card, sentence panel, movie chat
    ui/                 # primitives (button, glass panel, …)
  features/
    subtitles/          # .srt/.vtt parsing, cue model, tokenizer
    vocabulary/
    review/             # SRS
  lib/
    ai/                 # server actions, prompts, mode system-prompts, schemas
    supabase/           # client + server helpers
    design/             # tokens (source of truth, mirrored in globals.css)
  types/
supabase/migrations/    # SQL migrations
```

## Build phases

0. ✅ Scaffold & plan — tokens, migrations, AI contract, Supabase helpers
1. ✅ The core loop: player + clickable dual subtitles + real AI word card & streaming sentence panel + save
2. ✅ Learning data: vocabulary/sentence views, shared `ai_cache`, watch progress + continue watching
3. ✅ Dashboard (goal / streak / weekly) & SM-2 spaced-repetition review
4. ✅ Subtitle search (incl. Konjunktiv II / Passiv / Modalpartikel presets), AI mode switcher, per-movie chat, statistics
5. ✅ Idiom-detection pass over scene cues · Anki export (.tsv) — pronunciation practice stays deferred until we can do it honestly (no fake scores)

## Keyboard shortcuts (player)

Space/K play · ←/→ ±5s · J/L ±10s · R repeat line · S cycle subtitles (DE+EN → DE → EN → off) · E explain current line · &lt;/&gt; speed · M mute · F fullscreen
