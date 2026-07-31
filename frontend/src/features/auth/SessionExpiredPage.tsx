import { Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

export function SessionExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Tu sesión venció</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Por seguridad cerramos la sesión y eliminamos las credenciales locales. Inicia sesión nuevamente para continuar.</p>
        <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700" to="/login">Volver a iniciar sesión</Link>
      </section>
    </main>
  );
}
