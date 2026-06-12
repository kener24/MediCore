import { Loader2 } from "lucide-react";

export function Loader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-medium text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
      {label}
    </div>
  );
}
