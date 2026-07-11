import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const fieldClasses =
  "h-10 w-full rounded-[--radius-control] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:outline-none";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-muted">
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClasses} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${fieldClasses} appearance-none ${className}`} {...rest} />;
}
