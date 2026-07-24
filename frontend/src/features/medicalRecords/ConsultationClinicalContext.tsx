import { AlertTriangle, ChevronDown, HeartPulse, History, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "../../components/ui/Card";
import type { ConsultationClinicalContext } from "../../types/medicalRecord";
import { formatDateOnly } from "./medicalRecordUtils";

export function ConsultationClinicalContextPanel({ context }: { context: ConsultationClinicalContext | null }) {
  if (!context) return null;
  const patient = context.patient;
  const triage = context.current_triage;
  const vitalSigns = asRecord(triage?.vital_signs);

  return (
    <div className="space-y-4">
      <Card title="Resumen clínico del paciente">
        <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Fact icon={<UserRound className="h-4 w-4" />} label="Paciente" value={text(patient.nombre_completo)} />
          <Fact label="Identidad" value={text(patient.identidad) || "No registrada"} />
          <Fact label="Código" value={text(patient.codigo_paciente) || "No disponible"} />
          <Fact label="Contacto de emergencia" value={emergencyContact(patient)} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Risk label="Alergias" value={context.allergies} warning />
          <Risk label="Enfermedades crónicas" value={context.chronic_conditions} />
          <Risk label="Medicamentos crónicos" value={context.chronic_medications} />
        </div>
      </Card>

      <details className="rounded-lg border border-slate-200 bg-white shadow-soft" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-base font-semibold text-slate-900">
          <span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4 text-brand-600" />Triaje actual</span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-5 text-sm md:grid-cols-3">
          <Fact label="Motivo" value={text(triage?.chief_complaint) || "No registrado"} />
          <Fact label="Prioridad" value={priorityLabel(text(triage?.priority))} />
          <Fact label="Evaluación inicial" value={text(triage?.initial_assessment) || "No registrada"} />
          <Fact label="Temperatura" value={unit(vitalSigns.temperature, "°C")} />
          <Fact label="Presión arterial" value={bloodPressure(vitalSigns)} />
          <Fact label="Frecuencia cardíaca" value={unit(vitalSigns.heart_rate, "lpm")} />
          <Fact label="Frecuencia respiratoria" value={unit(vitalSigns.respiratory_rate, "rpm")} />
          <Fact label="Saturación" value={unit(vitalSigns.oxygen_saturation, "%")} />
          <Fact label="IMC" value={text(vitalSigns.bmi) || "No registrado"} />
          <Fact label="Dolor" value={vitalSigns.pain_scale == null ? "No registrado" : `${text(vitalSigns.pain_scale)}/10`} />
          <Fact label="Observaciones" value={text(vitalSigns.notes) || text(triage?.notes) || "Sin observaciones"} />
          <Fact label="Enfermería" value={text(triage?.nurse_name) || "No disponible"} />
        </div>
      </details>

      <details className="rounded-lg border border-slate-200 bg-white shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-base font-semibold text-slate-900">
          <span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-brand-600" />Antecedentes recientes</span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <div className="grid gap-5 border-t border-slate-200 p-5 lg:grid-cols-2">
          <HistoryGroup
            empty="No hay consultas anteriores registradas."
            items={context.recent_consultations.map((item) => ({
              id: item.id,
              meta: `${formatDateOnly(item.consultation_date)} · ${item.doctor_nombre || "Médico no disponible"}`,
              title: item.chief_complaint || "Consulta sin motivo",
              body: item.preliminary_diagnosis || item.recommendations || "Sin diagnóstico visible",
            }))}
            title="Últimas consultas"
          />
          <HistoryGroup
            empty="No hay diagnósticos previos registrados."
            items={context.recent_diagnoses.map((item, index) => ({
              id: Number(item.id) || index,
              meta: text(item.doctor_nombre) || "Médico no disponible",
              title: text(item.name) || text(item.description) || "Diagnóstico sin descripción",
              body: text(item.code),
            }))}
            title="Diagnósticos recientes"
          />
        </div>
      </details>
    </div>
  );
}

function Fact({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return <div><p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">{icon}{label}</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{value}</p></div>;
}

function Risk({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`rounded-md border p-3 ${warning && value ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}><p className={`flex items-center gap-1 text-xs font-semibold uppercase ${warning && value ? "text-rose-700" : "text-slate-600"}`}>{warning ? <AlertTriangle className="h-4 w-4" /> : null}{label}</p><p className="mt-1 text-sm text-slate-800">{value || `No hay ${label.toLowerCase()} registrados.`}</p></div>;
}

function HistoryGroup({ empty, items, title }: { empty: string; items: Array<{ id: number; meta: string; title: string; body: string }>; title: string }) {
  return <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div className="border-l-2 border-brand-200 pl-3" key={item.id}><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{item.meta}</p>{item.body ? <p className="mt-1 text-sm text-slate-600">{item.body}</p> : null}</div>) : <p className="text-sm text-slate-500">{empty}</p>}</div></div>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function unit(value: unknown, suffix: string) {
  return value == null || value === "" ? "No registrado" : `${text(value)} ${suffix}`;
}

function bloodPressure(vitals: Record<string, unknown>) {
  const systolic = vitals.blood_pressure_systolic ?? vitals.systolic_pressure;
  const diastolic = vitals.blood_pressure_diastolic ?? vitals.diastolic_pressure;
  return systolic != null && diastolic != null ? `${text(systolic)}/${text(diastolic)} mmHg` : "No registrada";
}

function priorityLabel(value: string) {
  return ({ normal: "Normal", priority: "Prioritaria", urgent: "Urgente", emergency: "Emergencia" } as Record<string, string>)[value] || "No definida";
}

function emergencyContact(patient: Record<string, unknown>) {
  return [patient.contacto_emergencia_nombre, patient.contacto_emergencia_parentesco, patient.contacto_emergencia_telefono].filter(Boolean).join(" · ") || "No registrado";
}
