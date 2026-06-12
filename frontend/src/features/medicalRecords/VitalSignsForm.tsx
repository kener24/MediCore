import { useMemo, useState, type FormEvent } from "react";

import type { VitalSigns, VitalSignsPayload } from "../../types/medicalRecord";

interface VitalSignsFormProps {
  vitalSigns?: VitalSigns | null;
  disabled?: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: VitalSignsPayload) => Promise<void>;
}

export function VitalSignsForm({ vitalSigns, disabled = false, isSubmitting, onSubmit }: VitalSignsFormProps) {
  const [payload, setPayload] = useState<VitalSignsPayload>({
    temperature: vitalSigns?.temperature ?? "",
    blood_pressure_systolic: vitalSigns?.blood_pressure_systolic ?? undefined,
    blood_pressure_diastolic: vitalSigns?.blood_pressure_diastolic ?? undefined,
    heart_rate: vitalSigns?.heart_rate ?? undefined,
    respiratory_rate: vitalSigns?.respiratory_rate ?? undefined,
    oxygen_saturation: vitalSigns?.oxygen_saturation ?? undefined,
    weight: vitalSigns?.weight ?? "",
    height: vitalSigns?.height ?? "",
    glucose: vitalSigns?.glucose ?? undefined,
    notes: vitalSigns?.notes ?? "",
  });
  const bmi = useMemo(() => {
    const weight = Number(payload.weight);
    const height = Number(payload.height);
    if (!weight || !height) return vitalSigns?.bmi ?? "";
    return (weight / (height * height)).toFixed(2);
  }, [payload.height, payload.weight, vitalSigns?.bmi]);

  function update(key: keyof VitalSignsPayload, value: string) {
    setPayload((current) => ({ ...current, [key]: value === "" ? "" : value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(payload);
  }

  return (
    <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
      {[
        ["temperature", "Temperatura", "number"],
        ["blood_pressure_systolic", "Sistolica", "number"],
        ["blood_pressure_diastolic", "Diastolica", "number"],
        ["heart_rate", "Pulso", "number"],
        ["respiratory_rate", "Respiracion", "number"],
        ["oxygen_saturation", "Oxigeno", "number"],
        ["weight", "Peso kg", "number"],
        ["height", "Altura m", "number"],
        ["glucose", "Glucosa", "number"],
      ].map(([key, label, type]) => (
        <label key={key} className="space-y-1 text-sm font-medium text-slate-700">
          {label}
          <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} step="0.01" type={type} value={String(payload[key as keyof VitalSignsPayload] ?? "")} onChange={(event) => update(key as keyof VitalSignsPayload, event.target.value)} />
        </label>
      ))}
      <div className="space-y-1 text-sm font-medium text-slate-700">
        BMI
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">{bmi || "Automatico"}</div>
      </div>
      <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-4">
        Notas de signos vitales
        <textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={disabled} value={payload.notes ?? ""} onChange={(event) => update("notes", event.target.value)} />
      </label>
      {!disabled ? <div className="md:col-span-4"><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Guardando..." : "Guardar signos vitales"}</button></div> : null}
    </form>
  );
}
