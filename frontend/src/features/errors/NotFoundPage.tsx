import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Página no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">La ruta solicitada no existe o no está disponible en esta etapa de MediCore.</p>
        <div className="mt-6 flex justify-center">
          <Link to="/dashboard">
            <Button>Volver al dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
