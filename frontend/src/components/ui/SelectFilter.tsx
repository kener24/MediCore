import type { SelectHTMLAttributes } from "react";

interface SelectFilterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ label: string; value: string }>;
}

export function SelectFilter({ options, ...props }: SelectFilterProps) {
  return (
    <select
      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
