import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDoctor } from "../../api/doctorsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { DoctorProfile } from "../../types/doctor";

export function DoctorDetailsPage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setDoctor(await getDoctor(id));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (!doctor) return null;
  const fields = [
    ["Nombre", doctor.user_nombre ?? ""],
    ["Email", doctor.user_email ?? ""],
    ["Telefono", doctor.user_telefono || "Sin telefono"],
    ["Clinica", doctor.clinic_nombre ?? ""],
    ["Especialidad", doctor.specialty_nombre ?? ""],
    ["Colegiacion", doctor.numero_colegiacion],
    ["Titulo", doctor.titulo_profesional || "Sin titulo"],
    ["Tarifa", `L ${doctor.tarifa_consulta}`],
    ["Duracion", `${doctor.duracion_consulta_minutos} min`],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={doctor.user_nombre ?? "Medico"} description="Detalle profesional." actions={<Link to={`/clinic/doctors/${doctor.id}/schedules`}><Button icon={<CalendarClock className="h-4 w-4" />}>Horarios</Button></Link>} />
      <Card>
        <div className="mb-4"><StatusBadge active={doctor.activo} /></div>
        <dl className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, value]) => <Info key={label} label={label} value={value} />)}
          <Info label="Atiende virtual" value={doctor.atiende_virtual ? "Si" : "No"} />
          <Info label="Atiende presencial" value={doctor.atiende_presencial ? "Si" : "No"} />
        </dl>
        <div className="mt-4 rounded-md bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Biografia</p>
          <p className="mt-1 text-sm text-slate-700">{doctor.biografia || "Sin biografia"}</p>
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>;
}
