import { useMemo, useState, type FormEvent } from "react";

import type { VitalSigns, VitalSignsPayload } from "../../types/medicalRecord";
import { cleanDecimal } from "../../utils/inputSanitizers";

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
    const decimals = key === "temperature" ? 1 : 2;
    setPayload((current) => ({ ...current, [key]: value === "" ? "" : cleanDecimal(value, decimals) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(payload);
  }

  return (
    <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
      {[
        ["temperature", "Temperatura"],
        ["blood_pressure_systolic", "Sistolica"],
        ["blood_pressure_diastolic", "Diastolica"],
        ["heart_rate", "Pulso"],
        ["respiratory_rate", "Respiracion"],
        ["oxygen_saturation", "Oxigeno"],
        ["weight", "Peso kg"],
        ["height", "Altura m"],
        ["glucose", "Glucosa"],
      ].map(([key, label]) => (
        <label key={key} className="space-y-1 text-sm font-medium text-slate-700">
          {label}
          <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={disabled} inputMode="decimal" value={String(payload[key as keyof VitalSignsPayload] ?? "")} onChange={(event) => update(key as keyof VitalSignsPayload, event.target.value)} />
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
