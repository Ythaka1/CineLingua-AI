import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · CineLingua AI" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-medium tracking-widest text-accent uppercase">
          CineLingua AI
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight">
          Learn German from the movies you love
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Watch. Click. Understand. Remember.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
