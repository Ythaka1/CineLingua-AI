# CineLingua AI

Learn German naturally by watching movies and shows with an AI tutor.

Not a subtitle translator — an immersive tutor for B2/C1 learners. The core
loop: **watch → click a word or sentence → get an AI explanation that teaches
register, nuance, and how Germans actually phrase it → save it → review it.**

## Stack

- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Motion
- Supabase (Postgres + Auth) — migrations in `supabase/migrations/`, RLS on everything user-owned
- Anthropic Claude (official SDK), server-side only, Zod-validated at every boundary
- HTML5 video + user-supplied local files with imported `.srt`/`.vtt` subtitles (v1)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
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
1. The core loop: player + clickable dual subtitles + real AI word card & sentence panel + save
2. Learning data: vocabulary/sentence views, AI cache, watch progress
3. Dashboard & SRS review
4. Subtitle search, AI modes, per-movie chat, statistics
5. Idiom detection, honest pronunciation practice, Anki export
