"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Tag } from "@/components/ui/Tag";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Home", icon: "◈" },
  { href: "/library", label: "Library", icon: "▶" },
  { href: "/vocabulary", label: "Vocabulary", icon: "🗂" },
  { href: "/sentences", label: "Sentences", icon: "❝" },
  { href: "/review", label: "Review", icon: "↺" },
  { href: "/search", label: "Search", icon: "⌕" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function Sidebar({
  email,
  cefr,
  streak,
}: {
  email: string;
  cefr: string;
  streak: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/60 px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="text-lg font-semibold tracking-tight">
          Cine<span className="text-accent">Lingua</span>
        </span>
      </Link>

      <div className="mt-3 flex items-center gap-2 px-2">
        <Tag tone="accent">{cefr}</Tag>
        {streak > 0 ? <Tag tone="success">🔥 {streak}-day streak</Tag> : null}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                active
                  ? "bg-accent-soft font-medium text-foreground"
                  : "text-muted hover:bg-white/[0.04] hover:text-foreground"
              }`}
            >
              <span className="w-4 text-center text-[13px] opacity-80" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border pt-4">
        <p className="truncate px-2 text-xs text-muted" title={email}>
          {email}
        </p>
        <button
          onClick={signOut}
          className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
