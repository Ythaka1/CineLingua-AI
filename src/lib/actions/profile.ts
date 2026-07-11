"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  targetDialect: z.enum(["DE", "AT", "CH"]),
  dailyGoalMinutes: z.number().int().min(5).max(240),
});

export async function updateProfile(input: z.infer<typeof updateProfileSchema>) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      cefr_level: parsed.data.cefrLevel,
      target_dialect: parsed.data.targetDialect,
      daily_goal_minutes: parsed.data.dailyGoalMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: "Could not update profile." };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
