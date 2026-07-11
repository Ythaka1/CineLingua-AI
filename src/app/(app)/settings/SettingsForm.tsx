"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { updateProfile } from "@/lib/actions/profile";
import type { CefrLevel, TargetDialect } from "@/types/database";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DIALECTS: { value: TargetDialect; label: string }[] = [
  { value: "DE", label: "Germany (Hochdeutsch)" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
];

export function SettingsForm(props: {
  cefrLevel: CefrLevel;
  targetDialect: TargetDialect;
  dailyGoalMinutes: number;
}) {
  const [cefr, setCefr] = useState<CefrLevel>(props.cefrLevel);
  const [dialect, setDialect] = useState<TargetDialect>(props.targetDialect);
  const [goal, setGoal] = useState(props.dailyGoalMinutes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await updateProfile({
      cefrLevel: cefr,
      targetDialect: dialect,
      dailyGoalMinutes: goal,
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <div>
        <Label htmlFor="cefr">Your German level (CEFR)</Label>
        <Select id="cefr" value={cefr} onChange={(e) => setCefr(e.target.value as CefrLevel)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
              {l === "B2" ? " — telc/Goethe exam target" : ""}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="dialect">Target variety</Label>
        <Select
          id="dialect"
          value={dialect}
          onChange={(e) => setDialect(e.target.value as TargetDialect)}
        >
          {DIALECTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="goal">Daily goal (minutes)</Label>
        <Input
          id="goal"
          type="number"
          min={5}
          max={240}
          value={goal}
          onChange={(e) => setGoal(Number(e.target.value))}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save settings"}
        </Button>
        {status === "saved" ? <span className="text-sm text-success">Saved ✓</span> : null}
        {status === "error" ? (
          <span className="text-sm text-danger">Could not save — try again.</span>
        ) : null}
      </div>
    </form>
  );
}
