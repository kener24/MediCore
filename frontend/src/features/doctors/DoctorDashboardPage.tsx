import { useEffect, useState } from "react";
import { CalendarClock, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDoctorDashboard } from "../../api/doctorsApi";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { DoctorDashboard } from "../../types/doctor";

export function DoctorDashboardPage() {
  const [data, setData] = useState<DoctorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setData(await getDoctorDashboard()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, []);
  if (loading) return <Loader />;
  if (!data?.doctor) return <EmptyState title="Aun no tienes perfil medico configurado." description="Solicita al administrador de tu clinica crear tu perfil profesional." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Medico" description="Tu perfil profesional y horarios." />
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Especialidad" value={data.doctor.specialty} icon={<Stethoscope className="h-6 w-6" />} />
        <StatCard label="Horarios activos" value={data.schedules.length} icon={<CalendarClock className="h-6 w-6" />} />
      </div>
      <Card title={data.doctor.nombre_completo}>
        <p className="text-sm text-slate-600">Colegiacion: <strong>{data.doctor.numero_colegiacion}</strong></p>
      </Card>
      <ScheduleReadOnly schedules={data.schedules} />
    </div>
  );
}

export function ScheduleReadOnly({ schedules }: { schedules: DoctorDashboard["schedules"] }) {
  return (
    <Card title="Horarios">
      <Table data={schedules} emptyMessage="No hay horarios activos." columns={[
        { key: "dia", header: "Dia", render: (s) => s.dia_semana },
        { key: "inicio", header: "Inicio", render: (s) => s.hora_inicio.slice(0, 5) },
        { key: "fin", header: "Fin", render: (s) => s.hora_fin.slice(0, 5) },
      ]} />
    </Card>
  );
}
