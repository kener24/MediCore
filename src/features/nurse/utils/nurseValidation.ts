import type { CompleteTriagePayload, TriagePriority, VitalSignsPayload } from '@/features/nurse/types/nurse.types';

export const priorityOptions: { label: string; value: TriagePriority }[] = [
  { label: 'Crítica', value: 'critical' },
  { label: 'Urgente', value: 'urgent' },
  { label: 'Preferente', value: 'preferential' },
  { label: 'Normal', value: 'normal' },
  { label: 'Baja', value: 'low' },
];

export function calculateBmi(weightKg?: number, heightCm?: number) {
  if (!weightKg || !heightCm) return undefined;
  const meters = heightCm / 100;
  if (meters <= 0) return undefined;
  return Number((weightKg / (meters * meters)).toFixed(2));
}

export function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function onlyNumericText(value: string, allowDecimal = false) {
  const normalized = value.replace(',', '.');
  return normalized.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
}

export function validateVitalSigns(payload: VitalSignsPayload) {
  const errors: string[] = [];
  const inRange = (value: number | undefined, min: number, max: number, label: string) => {
    if (value === undefined) return;
    if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label} debe estar entre ${min} y ${max}.`);
  };
  inRange(payload.temperature, 30, 45, 'La temperatura');
  inRange(payload.heart_rate, 20, 240, 'La frecuencia cardíaca');
  inRange(payload.respiratory_rate, 5, 80, 'La frecuencia respiratoria');
  inRange(payload.systolic_pressure, 50, 260, 'La presión sistólica');
  inRange(payload.diastolic_pressure, 30, 180, 'La presión diastólica');
  inRange(payload.oxygen_saturation, 1, 100, 'La saturación de oxígeno');
  inRange(payload.weight_kg, 0.5, 400, 'El peso');
  inRange(payload.height_cm, 20, 250, 'La talla');
  inRange(payload.pain_scale, 0, 10, 'La escala de dolor');
  inRange(payload.glucose, 20, 700, 'La glucosa');
  if (
    payload.systolic_pressure !== undefined &&
    payload.diastolic_pressure !== undefined &&
    payload.systolic_pressure <= payload.diastolic_pressure
  ) {
    errors.push('La presión sistólica debe ser mayor que la diastólica.');
  }
  const hasAnyVital = [
    payload.temperature,
    payload.heart_rate,
    payload.respiratory_rate,
    payload.systolic_pressure,
    payload.diastolic_pressure,
    payload.oxygen_saturation,
    payload.weight_kg,
    payload.height_cm,
    payload.pain_scale,
    payload.glucose,
  ].some((value) => value !== undefined);
  if (!hasAnyVital) errors.push('Registra al menos un signo vital.');
  return errors;
}

export function validateTriage(payload: CompleteTriagePayload) {
  const errors: string[] = [];
  if (!payload.chief_complaint.trim()) errors.push('La queja principal es requerida.');
  if (!payload.initial_assessment.trim()) errors.push('La evaluación inicial es requerida.');
  if (!payload.priority) errors.push('Selecciona la prioridad del paciente.');
  return errors;
}
