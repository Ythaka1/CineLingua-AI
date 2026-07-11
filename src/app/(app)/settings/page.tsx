import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings · CineLingua AI" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("cefr_level, target_dialect, daily_goal_minutes")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        The tutor calibrates every explanation to your level and target variety.
      </p>
      <SettingsForm
        cefrLevel={profile?.cefr_level ?? "B2"}
        targetDialect={profile?.target_dialect ?? "DE"}
        dailyGoalMinutes={profile?.daily_goal_minutes ?? 20}
      />
    </div>
  );
}
