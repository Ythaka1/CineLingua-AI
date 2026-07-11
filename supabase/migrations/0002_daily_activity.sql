-- Daily activity log — powers today's goal, streak, and the weekly chart.
-- One row per user per day; the player and review UI add seconds as you go.

create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);

alter table public.daily_activity enable row level security;

create policy "daily_activity: all own" on public.daily_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomic increment used by the client on a heartbeat.
create function public.add_activity(p_seconds integer)
returns void
language sql
security invoker
as $$
  insert into public.daily_activity (user_id, day, seconds)
  values (auth.uid(), current_date, p_seconds)
  on conflict (user_id, day)
  do update set seconds = public.daily_activity.seconds + excluded.seconds;
$$;
