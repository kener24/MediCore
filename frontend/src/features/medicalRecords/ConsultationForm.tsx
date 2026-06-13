import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Card } from "../../components/ui/Card";
import type { DoctorProfile } from "../../types/doctor";
import type { ConsultationPayload, ClinicalConsultation } from "../../types/medicalRecord";
import type { Patient } from "../../types/patient";
import { todayIso } from "./medicalRecordUtils";

interface ConsultationFormProps {
  consultation?: ClinicalConsultation | null;
  isSubmitting: boolean;
  onSubmit: (payload: ConsultationPayload) => Promise<void>;
}

export function ConsultationForm({ consultation, isSubmitting, onSubmit }: ConsultationFormProps) {
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient") ?? "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [payload, setPayload] = useState<ConsultationPayload>({
    patient: consultation?.patient ?? initialPatient,
    doctor: consultation?.doctor ?? "",
    consultation_date: consultation?.consultation_date ?? todayIso(),
    start_time: consultation?.start_time?.slice(0, 5) ?? "",
    end_time: consultation?.end_time?.slice(0, 5) ?? "",
    chief_complaint: consultation?.chief_complaint ?? "",
    symptoms: consultation?.symptoms ?? "",
    physical_exam: consultation?.physical_exam ?? "",
    clinical_assessment: consultation?.clinical_assessment ?? "",
    preliminary_diagnosis: consultation?.preliminary_diagnosis ?? "",
    treatment_plan: consultation?.treatment_plan ?? "",
    recommendations: consultation?.recommendations ?? "",
    private_notes: consultation?.private_notes ?? "",
  });
  const disabled = consultation?.status === "finalizada";

  useEffect(() => {
    async function load() {
      try {
        const [patientData, doctorData] = await Promise.all([getPatients({ is_active: "true" }), getDoctors({ is_active: "true" })]);
        setPatients(patientData);
        setDoctors(doctorData);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
    load();
  }, []);

  function update(key: keyof ConsultationPayload, value: string) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...payload,
      patient: Number(payload.patient),
      doctor: Number(payload.doctor),
      start_time: payload.start_time || undefined,
      end_time: payload.end_time || undefined,
    });
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">Paciente<select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled || Boolean(consultation)} required value={payload.patient} onChange={(event) => update("patient", event.target.value)}><option value="">Seleccionar paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombre_completo}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Medico<select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled || Boolean(consultation)} required value={payload.doctor} onChange={(event) => update("doctor", event.target.value)}><option value="">Seleccionar medico</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user_nombre}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Fecha<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} required type="date" value={payload.consultation_date} onChange={(event) => update("consultation_date", event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium text-slate-700">Inicio<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} type="time" value={payload.start_time ?? ""} onChange={(event) => update("start_time", event.target.value)} /></label><label className="space-y-1 text-sm font-medium text-slate-700">Fin<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} type="time" value={payload.end_time ?? ""} onChange={(event) => update("end_time", event.target.value)} /></label></div>
        </div>
      </Card>
      <Card title="Evaluacion clinica">
        <div className="grid gap-4">
          {[
            ["chief_complaint", "Motivo de consulta"],
            ["symptoms", "Sintomas"],
            ["physical_exam", "Examen fisico"],
            ["clinical_assessment", "Evaluacion medica"],
            ["preliminary_diagnosis", "Impresion diagnostica inicial"],
            ["treatment_plan", "Tratamiento o indicaciones"],
            ["recommendations", "Recomendaciones"],
            ["private_notes", "Notas privadas"],
          ].map(([key, label]) => <label key={key} className="space-y-1 text-sm font-medium text-slate-700">{label}<textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={disabled} value={String(payload[key as keyof ConsultationPayload] ?? "")} onChange={(event) => update(key as keyof ConsultationPayload, event.target.value)} /></label>)}
        </div>
      </Card>
      {!disabled ? <div className="flex justify-end"><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Guardando..." : "Guardar borrador"}</button></div> : null}
    </form>
  );
}
