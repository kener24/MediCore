import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, LockKeyhole, Mail } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";
import { homePathForRole, roleNameFromUser } from "../../utils/roleHome";

const schema = z.object({
  email: z.string().email("Ingresa un email válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { isAuthenticated, isBootstrapping, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    document.title = "Login | MediCore";
  }, []);

  if (isBootstrapping) {
    return <Loader label="Validando acceso..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(values: LoginValues) {
    try {
      const authenticatedUser = await login(values);
      toast.success("Sesión iniciada correctamente.");
      navigate(from === "/dashboard" ? homePathForRole(roleNameFromUser(authenticatedUser)) : from, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
        <section className="hidden bg-ink-900 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-500 p-3">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MediCore</h1>
              <p className="text-sm text-brand-100">Administración clínica centralizada</p>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-100">Sistema SaaS médico</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">Gestiona usuarios, clínicas y roles desde un panel seguro.</h2>
            <p className="mt-5 text-base leading-7 text-slate-200">
              Interfaz preparada para crecer hacia los siguientes módulos clínicos sin mezclar la base administrativa.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-200">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">JWT</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Roles</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Clínicas</div>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-soft">
            <div className="mb-7">
              <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3 text-brand-700 lg:hidden">
                <Activity className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
              <p className="mt-2 text-sm text-slate-500">Accede al panel administrativo de MediCore.</p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="relative">
                <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
                <Mail className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
              </div>
              <div className="relative">
                <Input label="Contraseña" type="password" error={errors.password?.message} {...register("password")} />
                <LockKeyhole className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
              </div>
              <div className="flex justify-end">
                <Link className="text-sm font-semibold text-brand-700 hover:underline" to="/forgot-password">
                  Olvide mi contrasena
                </Link>
              </div>
              <Button className="w-full" type="submit" isLoading={isSubmitting}>
                Entrar
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
