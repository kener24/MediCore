import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getMyDoctorProfile } from "../../api/doctorsApi";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { DoctorProfile } from "../../types/doctor";

export function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setDoctor(await getMyDoctorProfile()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, []);
  if (loading) return <Loader />;
  if (!doctor) return <EmptyState title="Aun no tienes perfil medico configurado." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Mi Perfil Medico" description="Informacion profesional en solo lectura." />
      <Card>
        <dl className="grid gap-4 md:grid-cols-2">
          {[
            ["Nombre", doctor.user_nombre ?? ""],
            ["Especialidad", doctor.specialty_nombre ?? ""],
            ["Colegiacion", doctor.numero_colegiacion],
            ["Titulo", doctor.titulo_profesional || "Sin titulo"],
            ["Tarifa", `L ${doctor.tarifa_consulta}`],
            ["Duracion", `${doctor.duracion_consulta_minutos} min`],
          ].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>)}
        </dl>
      </Card>
    </div>
  );
}
