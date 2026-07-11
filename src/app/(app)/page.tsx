import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date().toISOString();
  const [
    { data: profile },
    { data: activity },
    { data: continueRow },
    { count: dueWords },
    { count: dueSentences },
    { count: totalWords },
    { count: totalSentences },
    { count: mediaCount },
    { data: wordLevels },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("cefr_level, daily_goal_minutes, streak")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_activity")
      .select("day, seconds")
      .gte("day", isoDaysAgo(6)),
    supabase
      .from("watch_progress")
      .select("media_id, position_ms, updated_at, media(title, duration_ms, poster_url)")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("saved_words")
      .select("id", { count: "exact", head: true })
      .lte("next_review", now),
    supabase
      .from("saved_sentences")
      .select("id", { count: "exact", head: true })
      .lte("next_review", now),
    supabase.from("saved_words").select("id", { count: "exact", head: true }),
    supabase.from("saved_sentences").select("id", { count: "exact", head: true }),
    supabase.from("media").select("id", { count: "exact", head: true }),
    supabase.from("saved_words").select("cefr"),
  ]);

  const goalMinutes = profile?.daily_goal_minutes ?? 20;
  const secondsByDay = new Map((activity ?? []).map((a) => [a.day, a.seconds]));
  const todayMinutes = Math.floor((secondsByDay.get(isoDaysAgo(0)) ?? 0) / 60);
  const goalPct = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const totalWatchMinutes = Math.floor(
    (activity ?? []).reduce((sum, a) => sum + a.seconds, 0) / 60,
  );

  const week = Array.from({ length: 7 }, (_, i) => {
    const iso = isoDaysAgo(6 - i);
    const date = new Date(`${iso}T12:00:00Z`);
    return {
      iso,
      label: date.toLocaleDateString("en", { weekday: "narrow" }),
      minutes: Math.floor((secondsByDay.get(iso) ?? 0) / 60),
    };
  });
  const weekMax = Math.max(goalMinutes, ...week.map((d) => d.minutes), 1);

  const due = (dueWords ?? 0) + (dueSentences ?? 0);
  const levelCounts = new Map<string, number>();
  for (const w of wordLevels ?? []) {
    if (w.cefr) levelCounts.set(w.cefr, (levelCounts.get(w.cefr) ?? 0) + 1);
  }

  const cw = continueRow?.media as
    | { title: string; duration_ms: number | null; poster_url: string | null }
    | null
    | undefined;
  const cwPct =
    continueRow && cw?.duration_ms
      ? Math.min(100, Math.round((continueRow.position_ms / cw.duration_ms) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Guten Tag<span className="text-accent">.</span>
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        {todayMinutes >= goalMinutes
          ? "Today's goal is done — anything more is a bonus."
          : `${Math.max(0, goalMinutes - todayMinutes)} minutes to hit today's goal.`}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's goal */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-[13px] font-medium text-muted">Today&apos;s goal</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {todayMinutes}
            <span className="text-base font-normal text-muted"> / {goalMinutes} min</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </section>

        {/* Streak */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-[13px] font-medium text-muted">Streak</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {profile?.streak ?? 0}
            <span className="text-base font-normal text-muted"> days</span>
          </p>
          <p className="mt-3 text-[13px] text-muted">
            {profile?.streak ? "Keep the chain going. 🔥" : "Watch a few minutes to start one."}
          </p>
        </section>

        {/* Review queue */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-[13px] font-medium text-muted">Due for review</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {due}
            <span className="text-base font-normal text-muted"> cards</span>
          </p>
          {due > 0 ? (
            <Link href="/review" className="mt-3 inline-block">
              <Button size="sm">Review now</Button>
            </Link>
          ) : (
            <p className="mt-3 text-[13px] text-muted">All caught up.</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Weekly progress */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-[13px] font-medium text-muted">This week</h2>
          <div className="mt-4 flex h-28 items-end gap-2">
            {week.map((d, i) => (
              <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end">
                  <div
                    className={`w-full rounded-t-md ${
                      i === 6 ? "bg-accent" : "bg-accent/35"
                    }`}
                    style={{ height: `${Math.max(4, (d.minutes / weekMax) * 100)}%` }}
                    title={`${d.minutes} min`}
                  />
                </div>
                <span className="text-[11px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">{totalWatchMinutes} min in the last 7 days</p>
        </section>

        {/* Continue watching */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-[13px] font-medium text-muted">Continue watching</h2>
          {continueRow && cw ? (
            <Link
              href={`/watch/${continueRow.media_id}`}
              className="mt-3 flex gap-4 rounded-xl border border-border bg-white/[0.02] p-3 transition-colors hover:border-accent/40"
            >
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-elevated">
                {cw.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cw.poster_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center opacity-40">🎬</div>
                )}
              </div>
              <div className="min-w-0 self-center">
                <p className="truncate text-sm font-medium">{cw.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {cwPct > 0 ? `${cwPct}% watched` : "Just started"} — pick up where you left off
                </p>
              </div>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Nothing in progress.{" "}
              <Link href="/library" className="text-accent hover:underline">
                Import a movie
              </Link>{" "}
              to start the loop.
            </p>
          )}
        </section>
      </div>

      {/* Statistics */}
      <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-[13px] font-medium text-muted">Statistics</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalWords ?? 0}</p>
            <p className="text-[13px] text-muted">words saved</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalSentences ?? 0}</p>
            <p className="text-[13px] text-muted">sentences saved</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{mediaCount ?? 0}</p>
            <p className="text-[13px] text-muted">titles in library</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {(levelCounts.get("C1") ?? 0) + (levelCounts.get("C2") ?? 0)}
            </p>
            <p className="text-[13px] text-muted">
              C1+ words
              {levelCounts.size > 0
                ? ` (${[...levelCounts.entries()]
                    .sort()
                    .map(([l, n]) => `${l} ${n}`)
                    .join(" · ")})`
                : ""}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
