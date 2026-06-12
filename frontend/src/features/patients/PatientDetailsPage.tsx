import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getPatient } from "../../api/patientsApi";
import { BloodTypeBadge } from "../../components/ui/BloodTypeBadge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { GenderBadge } from "../../components/ui/GenderBadge";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { PatientCard } from "../../components/ui/PatientCard";
import type { Patient } from "../../types/patient";
import { formatDate } from "../../utils/formatDate";

export function PatientDetailsPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      if (!id) return;
      try { setPatient(await getPatient(id)); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [id]);
  if (loading) return <Loader />;
  if (!patient) return null;
  return <PatientDetailsContent patient={patient} />;
}

export function PatientDetailsContent({ patient }: { patient: Patient }) {
  const age = patient.fecha_nacimiento ? new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear() : null;
  return (
    <div className="space-y-6">
      <PageHeader title={patient.nombre_completo} description="Detalle del paciente." />
      <PatientCard patient={patient} />
      <Card title="Informacion personal">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Identidad" value={patient.identidad || "Sin identidad"} />
          <Info label="Fecha nacimiento" value={patient.fecha_nacimiento || "Sin fecha"} />
          <Info label="Edad" value={age ? `${age} años` : "Sin dato"} />
          <div><p className="text-xs font-semibold uppercase text-slate-500">Genero</p><div className="mt-1"><GenderBadge gender={patient.genero} /></div></div>
          <div><p className="text-xs font-semibold uppercase text-slate-500">Tipo sangre</p><div className="mt-1"><BloodTypeBadge bloodType={patient.tipo_sangre} /></div></div>
          <Info label="Creacion" value={formatDate(patient.creado_en)} />
        </div>
      </Card>
      <Card title="Contacto">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Telefono" value={patient.telefono || "Sin telefono"} />
          <Info label="Correo" value={patient.correo || "Sin correo"} />
          <Info label="Direccion" value={[patient.direccion, patient.ciudad, patient.departamento, patient.pais].filter(Boolean).join(", ") || "Sin direccion"} />
          <Info label="Emergencia" value={`${patient.contacto_emergencia_nombre || "Sin contacto"} ${patient.contacto_emergencia_telefono || ""} ${patient.contacto_emergencia_parentesco || ""}`} />
        </div>
      </Card>
      <Card title="Salud basica">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Alergias" value={patient.alergias || "Sin registro"} />
          <Info label="Enfermedades cronicas" value={patient.enfermedades_cronicas || "Sin registro"} />
          <Info label="Observaciones" value={patient.observaciones || "Sin observaciones"} />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {["Proximas citas", "Expediente medico", "Recetas", "Facturacion"].map((title) => <EmptyState key={title} title={title} description="Este modulo se agregara en proximos sprints." />)}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-900">{value}</p></div>;
}
