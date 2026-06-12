import clsx from "clsx";

interface BadgeProps {
  children: string;
  tone?: "active" | "inactive" | "role" | "neutral";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold",
        tone === "active" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        tone === "inactive" && "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        tone === "role" && "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
        tone === "neutral" && "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      )}
    >
      {children}
    </span>
  );
}
