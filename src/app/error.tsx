"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfig = error.message.includes("Supabase is not configured");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium tracking-widest text-accent uppercase">CineLingua AI</p>
      <h1 className="text-xl font-semibold">
        {isConfig ? "Setup needed" : "Something went wrong"}
      </h1>
      <p className="max-w-md text-sm text-muted">
        {isConfig
          ? "Copy .env.example to .env.local, fill in your Supabase URL, anon key and Anthropic API key, then restart the dev server."
          : "An unexpected error occurred. Your data is safe — try again."}
      </p>
      {!isConfig ? (
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      ) : null}
    </main>
  );
}
