import { redirect } from "next/navigation";

import { getSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { Sidebar } from "./Sidebar";

function SetupScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium tracking-widest text-accent uppercase">CineLingua AI</p>
      <h1 className="text-xl font-semibold">Almost there — connect Supabase</h1>
      <div className="max-w-md text-left text-sm leading-relaxed text-muted">
        <p>
          1. Copy <code className="rounded bg-white/[0.07] px-1">.env.example</code> to{" "}
          <code className="rounded bg-white/[0.07] px-1">.env.local</code>
        </p>
        <p>
          2. Fill in <code className="rounded bg-white/[0.07] px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="rounded bg-white/[0.07] px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
          <code className="rounded bg-white/[0.07] px-1">GEMINI_API_KEY</code>
        </p>
        <p>
          3. Apply the SQL in <code className="rounded bg-white/[0.07] px-1">supabase/migrations/</code>{" "}
          and restart the dev server
        </p>
      </div>
    </main>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!getSupabaseEnv()) return <SetupScreen />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("cefr_level, streak")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        email={user.email ?? ""}
        cefr={profile?.cefr_level ?? "B2"}
        streak={profile?.streak ?? 0}
      />
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
