import { useEffect, useState } from "react";
import { Building2, Stethoscope, UserCheck, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import { getClinicDashboard } from "../../api/clinicAdminApi";
import { getErrorMessage } from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { ClinicDashboardStats } from "../../types/clinicAdmin";

export function ClinicDashboardPage() {
  const [data, setData] = useState<ClinicDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard Clinica | MediCore";
    async function load() {
      try {
        setData(await getClinicDashboard());
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader />;
  if (!data) return null;

  const stats = [
    { label: "Total usuarios", value: data.total_users, icon: <Users className="h-6 w-6" /> },
    { label: "Usuarios activos", value: data.active_users, icon: <UserCheck className="h-6 w-6" /> },
    { label: "Usuarios inactivos", value: data.inactive_users, icon: <Users className="h-6 w-6" /> },
    { label: "Medicos", value: data.total_medicos, icon: <Stethoscope className="h-6 w-6" /> },
    { label: "Enfermeras", value: data.total_enfermeras, icon: <UserCheck className="h-6 w-6" /> },
    { label: "Recepcionistas", value: data.total_recepcionistas, icon: <Users className="h-6 w-6" /> },
    { label: "Pacientes", value: data.total_pacientes, icon: <UserRound className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard de clinica" description="Resumen operativo de tu clinica." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <Card title="Datos de la clinica">
        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Nombre" value={data.clinic.nombre} />
            <Info label="RTN" value={data.clinic.rtn || "Sin RTN"} />
            <Info label="Correo" value={data.clinic.correo || "Sin correo"} />
            <Info label="Telefono" value={data.clinic.telefono || "Sin telefono"} />
            <Info label="Direccion" value={data.clinic.direccion || "Sin direccion"} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
              <div className="mt-1">
                <StatusBadge active={data.clinic.activo} activeText="Activa" inactiveText="Inactiva" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
