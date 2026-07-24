import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Card } from "../../components/ui/Card";
import type { DoctorProfile } from "../../types/doctor";
import type { ConsultationPayload, ClinicalConsultation } from "../../types/medicalRecord";
import type { Patient } from "../../types/patient";

interface ConsultationFormProps {
  consultation?: ClinicalConsultation | null;
  isSubmitting: boolean;
  payload: ConsultationPayload;
  onChange: (payload: ConsultationPayload) => void;
  onSubmit: (payload: ConsultationPayload) => Promise<void>;
}

export function ConsultationForm({ consultation, isSubmitting, payload, onChange, onSubmit }: ConsultationFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
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
    onChange({ ...payload, [key]: value });
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
          <label className="space-y-1 text-sm font-medium text-slate-700">Médico<select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled || Boolean(consultation)} required value={payload.doctor} onChange={(event) => update("doctor", event.target.value)}><option value="">Seleccionar médico</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user_nombre}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Fecha<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} required type="date" value={payload.consultation_date} onChange={(event) => update("consultation_date", event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium text-slate-700">Inicio<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} type="time" value={payload.start_time ?? ""} onChange={(event) => update("start_time", event.target.value)} /></label><label className="space-y-1 text-sm font-medium text-slate-700">Fin<input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} type="time" value={payload.end_time ?? ""} onChange={(event) => update("end_time", event.target.value)} /></label></div>
        </div>
      </Card>
      <Card title="Evaluación clínica">
        <div className="grid gap-4">
          {[
            ["chief_complaint", "Motivo de consulta"],
            ["symptoms", "Síntomas"],
            ["physical_exam", "Examen físico"],
            ["clinical_assessment", "Evaluación médica"],
            ["preliminary_diagnosis", "Impresión diagnóstica inicial"],
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
