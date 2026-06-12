import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getPatientClinicalHistory } from "../../api/medicalRecordsApi";
import { ConsultationStatusBadge } from "../../components/ui/ConsultationStatusBadge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { ClinicalHistory } from "../../types/medicalRecord";
import { formatDateOnly, formatTime } from "./medicalRecordUtils";

export function ClinicalHistoryPage() {
  const { patientId } = useParams();
  const [history, setHistory] = useState<ClinicalHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!patientId) return;
      try { setHistory(await getPatientClinicalHistory(patientId)); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [patientId]);

  if (loading) return <Loader />;
  if (!history) return null;
  const patient = history.patient as { nombre_completo?: string; codigo_paciente?: string; identidad?: string };
  return (
    <div className="space-y-6">
      <PageHeader title="Historial clinico" description={`${patient.nombre_completo ?? "Paciente"} | ${patient.codigo_paciente ?? ""}`} />
      <Card title="Resumen del expediente">
        {history.medical_record ? <div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Expediente</p><p className="font-semibold text-slate-900">{history.medical_record.record_number}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Identidad</p><p>{patient.identidad || "Sin identidad"}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Sangre</p><p>{history.medical_record.blood_type || "Sin dato"}</p></div></div> : <p className="text-sm text-slate-500">El paciente aun no tiene expediente.</p>}
      </Card>
      <Card title="Linea de tiempo de consultas">
        <div className="space-y-4">
          {history.consultations.map((item) => (
            <Link key={item.id} className="block border-l-4 border-brand-500 bg-slate-50 p-4" to={`/clinic/consultations/${item.id}`}>
              <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-slate-900">{formatDateOnly(item.consultation_date)} | {formatTime(item.start_time)}</p><ConsultationStatusBadge status={item.status} /></div>
              <p className="mt-2 text-sm text-slate-700">{item.chief_complaint || "Consulta sin motivo"}</p>
              <p className="text-sm text-slate-500">{item.preliminary_diagnosis || "Sin diagnostico preliminar"}</p>
            </Link>
          ))}
          {!history.consultations.length ? <p className="text-sm text-slate-500">No hay consultas registradas.</p> : null}
        </div>
      </Card>
    </div>
  );
}
