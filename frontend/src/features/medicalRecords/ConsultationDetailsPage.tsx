import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createVitalSigns, finalizeConsultation, getConsultation, updateVitalSigns } from "../../api/medicalRecordsApi";
import { ConsultationStatusBadge } from "../../components/ui/ConsultationStatusBadge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { ClinicalConsultation, VitalSignsPayload } from "../../types/medicalRecord";
import { formatDateOnly, formatTime, roleNameFrom } from "./medicalRecordUtils";
import { VitalSignsForm } from "./VitalSignsForm";
import { ClinicalOrdersSection } from "./ClinicalOrdersSection";
import { ConsultationSupplyUsageSection } from "./ConsultationSupplyUsageSection";

export function ConsultationDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [consultation, setConsultation] = useState<ClinicalConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try { setConsultation(await getConsultation(id)); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  async function saveVitals(payload: VitalSignsPayload) {
    if (!id) return;
    setSaving(true);
    try {
      if (consultation?.vital_signs) await updateVitalSigns(id, payload);
      else await createVitalSigns(id, payload);
      toast.success("Signos vitales guardados correctamente.");
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  async function finalize() {
    if (!id) return;
    try { await finalizeConsultation(id); toast.success("Consulta finalizada correctamente."); setFinalizeOpen(false); await load(); } catch (error) { toast.error(getErrorMessage(error)); }
  }

  if (loading) return <Loader />;
  if (!consultation) return null;
  const canEdit = consultation.status === "borrador";
  const canVitals = ["medico", "enfermera"].includes(roleName);
  return (
    <div className="space-y-6">
      <PageHeader title="Detalle de consulta" description={`${consultation.patient_nombre} | ${formatDateOnly(consultation.consultation_date)} ${formatTime(consultation.start_time)}`} actions={<div className="flex gap-2">{canEdit ? <Link className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-slate-700" to={`/clinic/consultations/${consultation.id}/edit`}><Pencil className="h-4 w-4" />Editar</Link> : null}{roleName === "medico" && canEdit ? <button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" onClick={() => setFinalizeOpen(true)}>Finalizar</button> : null}</div>} />
      <Card>
        <div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Paciente</p><p className="font-semibold text-slate-900">{consultation.patient_nombre}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Medico</p><p>{consultation.doctor_nombre}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Estado</p><div className="mt-1"><ConsultationStatusBadge status={consultation.status} /></div></div></div>
      </Card>
      <Card title="Contenido clinico">
        <div className="grid gap-5 md:grid-cols-2">{[
          ["Motivo", consultation.chief_complaint],
          ["Sintomas", consultation.symptoms],
          ["Examen fisico", consultation.physical_exam],
          ["Evaluacion", consultation.clinical_assessment],
          ["Diagnostico preliminar", consultation.preliminary_diagnosis],
          ["Tratamiento", consultation.treatment_plan],
          ["Recomendaciones", consultation.recommendations],
          ["Notas privadas", consultation.private_notes],
        ].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{value || "Sin registro"}</p></div>)}</div>
      </Card>
      <Card title="Signos vitales">
        <VitalSignsForm vitalSigns={consultation.vital_signs} disabled={!canVitals || consultation.status === "finalizada"} isSubmitting={saving} onSubmit={saveVitals} />
      </Card>
      <ConsultationSupplyUsageSection consultationId={consultation.id} canEdit={["medico", "enfermera"].includes(roleName) && consultation.status === "borrador"} />
      <ClinicalOrdersSection consultationId={consultation.id} canEdit={roleName === "medico" && consultation.status === "borrador"} />
      <Modal open={finalizeOpen} title="Finalizar consulta" onClose={() => setFinalizeOpen(false)} actions={<><ModalCloseButton onClick={() => setFinalizeOpen(false)} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" onClick={finalize} type="button">Finalizar</button></>}>
        <p className="text-sm text-slate-600">La consulta quedara cerrada y pasara al historial clinico.</p>
      </Modal>
    </div>
  );
}
