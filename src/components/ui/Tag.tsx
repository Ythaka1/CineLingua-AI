const tones = {
  neutral: "bg-white/[0.06] text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
} as const;

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
