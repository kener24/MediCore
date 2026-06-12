import type { ReactNode } from "react";

import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  helper?: string;
}

export function StatCard({ label, value, icon, helper }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        </div>
        <div className="rounded-lg bg-brand-50 p-3 text-brand-700">{icon}</div>
      </div>
    </Card>
  );
}
