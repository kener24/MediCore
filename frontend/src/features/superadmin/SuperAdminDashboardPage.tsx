import { useEffect, useState } from "react";
import { BarChart3, Bell, Building2, CreditCard, FileText, Lock, ShieldCheck, Stethoscope, UserCheck, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getSuperAdminDashboard } from "../../api/adminApi";
import { getErrorMessage } from "../../api/axios";
import { getClinics } from "../../api/clinicsApi";
import { getUsers } from "../../api/usersApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { StatCard } from "../../components/ui/StatCard";
import type { SuperAdminDashboard } from "../../types/dashboard";

export function SuperAdminDashboardPage() {
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getSuperAdminDashboard());
    } catch (error) {
      try {
        const [users, clinics] = await Promise.all([getUsers(), getClinics()]);
        setData({
          total_clinics: clinics.length,
          active_clinics: clinics.filter((clinic) => clinic.activo).length,
          inactive_clinics: clinics.filter((clinic) => !clinic.activo).length,
          total_users: users.length,
          active_users: users.filter((user) => user.is_active).length,
          inactive_users: users.filter((user) => !user.is_active).length,
          total_admins: users.filter((user) => user.role_nombre === "admin").length,
          total_medicos: users.filter((user) => user.role_nombre === "medico").length,
          total_pacientes: users.filter((user) => user.role_nombre === "paciente").length,
        });
        setError("El resumen principal fallo, se muestran datos reconstruidos desde los listados.");
      } catch (fallbackError) {
        const message = getErrorMessage(fallbackError);
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Dashboard Global | MediCore";
    load();
  }, []);

  if (loading) return <Loader />;
  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Global</h1>
          <p className="mt-1 text-sm text-slate-500">Resumen general del SaaS MediCore.</p>
        </div>
        <Card>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-rose-700">{error || "No se pudo cargar la informacion del dashboard."}</p>
            <Button className="w-fit" variant="outline" onClick={load}>Reintentar</Button>
          </div>
        </Card>
      </div>
    );
  }

  const cards = [
    { label: "Total clinicas", value: data.total_clinics, icon: <Building2 className="h-6 w-6" /> },
    { label: "Clinicas activas", value: data.active_clinics, icon: <Building2 className="h-6 w-6" /> },
    { label: "Clinicas inactivas", value: data.inactive_clinics, icon: <Building2 className="h-6 w-6" /> },
    { label: "Total usuarios", value: data.total_users, icon: <Users className="h-6 w-6" /> },
    { label: "Usuarios activos", value: data.active_users, icon: <UserCheck className="h-6 w-6" /> },
    { label: "Usuarios inactivos", value: data.inactive_users, icon: <Users className="h-6 w-6" /> },
    { label: "Administradores", value: data.total_admins, icon: <ShieldCheck className="h-6 w-6" /> },
    { label: "Medicos", value: data.total_medicos, icon: <Stethoscope className="h-6 w-6" /> },
    { label: "Pacientes", value: data.total_pacientes, icon: <UserRound className="h-6 w-6" /> },
  ];
  const modules = [
    { label: "Clinicas", path: "/superadmin/clinics", icon: <Building2 className="h-5 w-5" /> },
    { label: "Usuarios", path: "/superadmin/users", icon: <Users className="h-5 w-5" /> },
    { label: "Reportes", path: "/superadmin/reports", icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Auditoria", path: "/superadmin/audit", icon: <FileText className="h-5 w-5" /> },
    { label: "Notificaciones", path: "/superadmin/notifications", icon: <Bell className="h-5 w-5" /> },
    { label: "Planes SaaS", path: "/superadmin/subscriptions/plans", icon: <CreditCard className="h-5 w-5" /> },
    { label: "Suscripciones", path: "/superadmin/subscriptions/clinics", icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "Seguridad", path: "/security/settings", icon: <Lock className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Global</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen general del SaaS MediCore.</p>
      </div>
      {error ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <Card title="Modulos principales">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link key={module.path} className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" to={module.path}>
              <span className="text-brand-700">{module.icon}</span>
              {module.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
