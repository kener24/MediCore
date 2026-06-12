import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getMyMedicalRecord } from "../../api/medicalRecordsApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { MedicalRecord } from "../../types/medicalRecord";

export function PatientMedicalRecordPage() {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setRecord(await getMyMedicalRecord()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, []);
  if (loading) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title="Mi expediente" description="Resumen clinico disponible para paciente." />
      <Card>
        {record ? <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase text-slate-500">Expediente</p><p className="font-semibold text-slate-900">{record.record_number}</p></div>
          <div><p className="text-xs font-semibold uppercase text-slate-500">Tipo de sangre</p><p>{record.blood_type || "Sin dato"}</p></div>
          <div><p className="text-xs font-semibold uppercase text-slate-500">Alergias</p><p>{record.allergies || "Sin registro"}</p></div>
          <div><p className="text-xs font-semibold uppercase text-slate-500">Enfermedades cronicas</p><p>{record.chronic_diseases || "Sin registro"}</p></div>
          <div className="md:col-span-2"><p className="text-xs font-semibold uppercase text-slate-500">Notas generales</p><p>{record.general_notes || "Sin notas"}</p></div>
        </div> : <p className="text-sm text-slate-500">Aun no tienes expediente medico disponible.</p>}
      </Card>
    </div>
  );
}
