import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">403</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">No tienes permiso para acceder</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Esta sección está reservada para el rol superadmin.</p>
        <div className="mt-6 flex justify-center">
          <Link to="/dashboard">
            <Button>Volver al dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
