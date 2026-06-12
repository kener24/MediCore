import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        type="search"
        {...props}
      />
    </div>
  );
}
