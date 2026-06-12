import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getMedicalRecord, getPatientClinicalHistory } from "../../api/medicalRecordsApi";
import { ConsultationStatusBadge } from "../../components/ui/ConsultationStatusBadge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { ClinicalConsultation, MedicalRecord } from "../../types/medicalRecord";
import { formatDateOnly, formatTime } from "./medicalRecordUtils";

export function MedicalRecordDetailsPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const recordData = await getMedicalRecord(id);
        setRecord(recordData);
        const history = await getPatientClinicalHistory(recordData.patient);
        setConsultations(history.consultations);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (!record) return null;
  return (
    <div className="space-y-6">
      <PageHeader title={`Expediente ${record.record_number}`} description={record.patient_nombre} actions={<Link className="h-10 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" to={`/clinic/patients/${record.patient}/clinical-history`}>Historial clinico</Link>} />
      <Card>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ["Tipo de sangre", record.blood_type || "Sin dato"],
            ["Alergias", record.allergies || "Sin alergias registradas"],
            ["Enfermedades cronicas", record.chronic_diseases || "Sin registro"],
            ["Antecedentes quirurgicos", record.surgical_history || "Sin registro"],
            ["Antecedentes familiares", record.family_history || "Sin registro"],
            ["Medicamentos actuales", record.current_medications || "Sin registro"],
          ].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{value}</p></div>)}
          <div className="md:col-span-2"><p className="text-xs font-semibold uppercase text-slate-500">Notas generales</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{record.general_notes || "Sin notas"}</p></div>
        </div>
      </Card>
      <Card title="Consultas clinicas">
        <div className="space-y-3">
          {consultations.map((item) => (
            <Link key={item.id} className="block rounded-md border border-slate-200 p-4 hover:bg-slate-50" to={`/clinic/consultations/${item.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold text-slate-900">{formatDateOnly(item.consultation_date)} | {formatTime(item.start_time)}</p><p className="text-sm text-slate-600">{item.chief_complaint || "Consulta sin motivo registrado"}</p></div>
                <ConsultationStatusBadge status={item.status} />
              </div>
            </Link>
          ))}
          {!consultations.length ? <p className="py-4 text-sm text-slate-500">No hay consultas registradas.</p> : null}
        </div>
      </Card>
      <Card title="Secciones futuras">
        <div className="grid gap-3 md:grid-cols-4">{["Diagnosticos", "Recetas", "Examenes", "Documentos"].map((label) => <div key={label} className="rounded-md border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">{label}</div>)}</div>
      </Card>
    </div>
  );
}
