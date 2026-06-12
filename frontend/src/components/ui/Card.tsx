import type { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, actions, children, className }: CardProps) {
  return (
    <section className={clsx("rounded-lg border border-slate-200 bg-white shadow-soft", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : <span />}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
