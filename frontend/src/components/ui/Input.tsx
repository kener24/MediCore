import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        id={inputId}
        className={clsx(
          "h-11 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
          error ? "border-rose-300" : "border-slate-300",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}
