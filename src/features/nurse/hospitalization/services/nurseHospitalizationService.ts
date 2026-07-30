import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';
import type {
  HospitalBed,
  HospitalizationEvent,
  HospitalTimelineEntry,
  InpatientVitalSigns,
  InpatientVitalSignsPayload,
  MedicationAdministration,
  MedicationAdministrationPayload,
  MedicalInstruction,
  NurseHospitalizationDashboard,
  NurseHospitalizationDetail,
  NurseHospitalizationListItem,
  NursingRound,
  NursingRoundPayload,
  NursingNote,
  NursingNotePayload,
} from '@/features/nurse/hospitalization/types/nurseHospitalization.types';
import { normalizeListResponse } from '@/features/nurse/types/nurse.types';
import { readNurseCache, saveNurseCache } from '@/features/nurse/utils/nurseCache';

const unavailableMessage = 'Hospitalización no disponible por el momento.';

type QueryParams = Record<string, string | number | boolean | undefined>;

function toNumber(value?: string | number) {
  if (value === '' || value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeVitalSignsPayload(payload: InpatientVitalSignsPayload) {
  const heightInput = toNumber(payload.height);
  const height = heightInput && heightInput > 3 ? Number((heightInput / 100).toFixed(2)) : heightInput;
  return {
    temperature: toNumber(payload.temperature),
    blood_pressure_systolic: toNumber(payload.blood_pressure_systolic ?? payload.systolic_pressure),
    blood_pressure_diastolic: toNumber(payload.blood_pressure_diastolic ?? payload.diastolic_pressure),
    heart_rate: toNumber(payload.heart_rate),
    respiratory_rate: toNumber(payload.respiratory_rate),
    oxygen_saturation: toNumber(payload.oxygen_saturation),
    weight: toNumber(payload.weight),
    height,
    glucose: toNumber(payload.glucose),
    pain_scale: toNumber(payload.pain_scale),
    notes: payload.notes?.trim() ?? '',
  };
}

function normalizeNotePayload(payload: NursingNotePayload) {
  const noteTypeMap: Record<string, string> = {
    care: 'normal',
    evolution: 'important',
    medication_related: 'medication',
    observation: 'observation',
    other: payload.priority === 'urgent' ? 'urgent' : 'normal',
  };
  const requested = payload.note_type || payload.priority || 'normal';
  const note_type = noteTypeMap[requested] ?? requested;
  return {
    note_type,
    title: payload.title?.trim() || noteTypeLabel(payload.note_type),
    note: payload.content.trim(),
    shift: payload.shift || 'other',
  };
}

export function noteTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    care: 'Cuidado',
    evolution: 'Evolución',
    important: 'Importante',
    incident: 'Incidente',
    medication: 'Relacionado a medicamento',
    medication_related: 'Relacionado a medicamento',
    normal: 'Normal',
    observation: 'Observación',
    other: 'Otro',
    urgent: 'Urgente',
  };
  return labels[String(type ?? '').toLowerCase()] ?? 'Nota de enfermería';
}

function normalizeError(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 400) return new Error(error.message || 'Revisa la información ingresada.');
    if (error.status === 401) return new Error('Tu sesión expiró. Inicia sesión nuevamente.');
    if (error.status === 403) return new Error('No tienes acceso al módulo de hospitalización.');
    if (error.status === 404) return new Error(unavailableMessage);
    if (error.status === 409) return new Error(error.message || 'La información cambió. Actualiza e intenta nuevamente.');
  }
  return error instanceof Error ? error : new Error(unavailableMessage);
}

async function getOrUnavailable<T>(url: string, params?: QueryParams) {
  try {
    const { data } = await apiClient.get<T>(url, { params });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function postOrUnavailable<T>(url: string, payload: unknown, idempotencyKey?: string) {
  try {
    const { data } = await apiClient.post<T>(url, payload, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getHospitalizationDashboard(): Promise<NurseHospitalizationDashboard> {
  try {
    return await getOrUnavailable<NurseHospitalizationDashboard>('/hospitalization/dashboard/');
  } catch {
    const inpatients = await getActiveInpatients({ active: true }).catch(() => []);
    return {
      active_patients: inpatients.filter((item) => ['active', 'transferred'].includes(String(item.status))).length,
      observation_patients: inpatients.filter((item) => item.status === 'observation').length,
    };
  }
}

export async function getActiveInpatients(params?: QueryParams): Promise<NurseHospitalizationListItem[]> {
  const query = params ?? { active: true };
  try {
    const data = await getOrUnavailable<NurseHospitalizationListItem[] | { results?: NurseHospitalizationListItem[] }>('/hospitalization/admissions/', query);
    const rows = normalizeListResponse<NurseHospitalizationListItem>(data);
    await saveNurseCache(`inpatients.${JSON.stringify(query)}`, rows);
    return rows;
  } catch (error) {
    const cached = await readNurseCache<NurseHospitalizationListItem[]>(`inpatients.${JSON.stringify(query)}`);
    if (cached) return cached.value;
    throw error;
  }
}

export async function getHospitalizationDetail(hospitalizationId: number): Promise<NurseHospitalizationDetail> {
  if (!hospitalizationId) throw new Error('No se puede abrir el internamiento sin identificador.');
  return getOrUnavailable<NurseHospitalizationDetail>(`/hospitalization/admissions/${hospitalizationId}/`);
}

export async function getInpatientVitalSigns(hospitalizationId: number): Promise<InpatientVitalSigns[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar signos sin internamiento.');
  const data = await getOrUnavailable<InpatientVitalSigns[] | { results?: InpatientVitalSigns[] }>(`/hospitalization/admissions/${hospitalizationId}/vital-signs/`);
  return normalizeListResponse<InpatientVitalSigns>(data);
}

export async function createInpatientVitalSigns(hospitalizationId: number, payload: InpatientVitalSignsPayload): Promise<InpatientVitalSigns> {
  if (!hospitalizationId) throw new Error('No se pueden registrar signos hospitalarios sin internamiento.');
  return postOrUnavailable<InpatientVitalSigns>(`/hospitalization/admissions/${hospitalizationId}/vital-signs/`, normalizeVitalSignsPayload(payload));
}

export async function getNursingNotes(hospitalizationId: number): Promise<NursingNote[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar notas sin internamiento.');
  const data = await getOrUnavailable<NursingNote[] | { results?: NursingNote[] }>(`/hospitalization/admissions/${hospitalizationId}/nursing-notes/`);
  return normalizeListResponse<NursingNote>(data);
}

export async function createNursingNote(hospitalizationId: number, payload: NursingNotePayload): Promise<NursingNote> {
  if (!hospitalizationId) throw new Error('No se puede crear una nota sin internamiento.');
  return postOrUnavailable<NursingNote>(`/hospitalization/admissions/${hospitalizationId}/nursing-notes/`, normalizeNotePayload(payload));
}

export async function getHospitalizationEvents(hospitalizationId: number): Promise<HospitalizationEvent[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar eventos sin internamiento.');
  const data = await getOrUnavailable<HospitalizationEvent[] | { results?: HospitalizationEvent[] }>(`/hospitalization/admissions/${hospitalizationId}/events/`);
  return normalizeListResponse<HospitalizationEvent>(data);
}

export async function createHospitalizationEvent(hospitalizationId: number, payload: { event_type: string; description: string; severity: string }): Promise<HospitalizationEvent> {
  if (!hospitalizationId) throw new Error('No se puede registrar un evento sin internamiento.');
  return postOrUnavailable<HospitalizationEvent>(`/hospitalization/admissions/${hospitalizationId}/events/`, payload);
}

export async function getHospitalTimeline(hospitalizationId: number): Promise<HospitalTimelineEntry[]> {
  if (!hospitalizationId) throw new Error('No se puede consultar la línea de tiempo sin internamiento.');
  const data = await getOrUnavailable<{ results?: HospitalTimelineEntry[] }>(`/hospitalization/admissions/${hospitalizationId}/timeline/`);
  return data.results ?? [];
}

export async function getMedicalInstructions(hospitalizationId: number): Promise<MedicalInstruction[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar indicaciones sin internamiento.');
  const data = await getOrUnavailable<MedicalInstruction[] | { results?: MedicalInstruction[] }>(`/hospitalization/admissions/${hospitalizationId}/instructions/`);
  return normalizeListResponse<MedicalInstruction>(data);
}

export async function acknowledgeMedicalInstruction(id: number): Promise<MedicalInstruction> {
  return postOrUnavailable<MedicalInstruction>(`/hospitalization/instructions/${id}/acknowledge/`, {});
}

export async function updateMedicalInstruction(id: number, action: 'start' | 'complete'): Promise<MedicalInstruction> {
  return postOrUnavailable<MedicalInstruction>(`/hospitalization/instructions/${id}/${action}/`, {});
}

export async function getBedStatus(params?: QueryParams): Promise<HospitalBed[]> {
  const data = await getOrUnavailable<HospitalBed[] | { results?: HospitalBed[] }>('/hospitalization/beds/', params);
  return normalizeListResponse<HospitalBed>(data);
}

export async function getAvailableBeds(): Promise<HospitalBed[]> {
  const data = await getOrUnavailable<HospitalBed[] | { results?: HospitalBed[] }>('/hospitalization/beds/available/');
  return normalizeListResponse<HospitalBed>(data);
}

export async function getNursingRounds(hospitalizationId: number): Promise<NursingRound[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar rondas sin internamiento.');
  const data = await getOrUnavailable<NursingRound[] | { results?: NursingRound[] }>(`/hospitalization/admissions/${hospitalizationId}/nursing-rounds/`);
  return normalizeListResponse<NursingRound>(data);
}

export async function createNursingRound(hospitalizationId: number, payload: NursingRoundPayload): Promise<NursingRound> {
  if (!hospitalizationId) throw new Error('No se puede crear una ronda sin internamiento.');
  const idempotencyKey = `nursing-round-${hospitalizationId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return postOrUnavailable<NursingRound>(`/hospitalization/admissions/${hospitalizationId}/nursing-rounds/`, payload, idempotencyKey);
}

export async function getMedicationAdministrations(hospitalizationId: number): Promise<MedicationAdministration[]> {
  if (!hospitalizationId) throw new Error('No se pueden consultar medicamentos sin internamiento.');
  const data = await getOrUnavailable<MedicationAdministration[] | { results?: MedicationAdministration[] }>(`/hospitalization/admissions/${hospitalizationId}/medication-administrations/`);
  return normalizeListResponse<MedicationAdministration>(data);
}

export async function createMedicationAdministration(hospitalizationId: number, payload: MedicationAdministrationPayload): Promise<MedicationAdministration> {
  if (!hospitalizationId) throw new Error('No se puede programar medicamento sin internamiento.');
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/admissions/${hospitalizationId}/medication-administrations/`, payload);
}

export async function getPendingMedications(): Promise<MedicationAdministration[]> {
  try {
    const data = await getOrUnavailable<MedicationAdministration[] | { results?: MedicationAdministration[] }>('/hospitalization/medications/pending/');
    const rows = normalizeListResponse<MedicationAdministration>(data);
    await saveNurseCache('pendingMedications', rows);
    return rows;
  } catch (error) {
    const cached = await readNurseCache<MedicationAdministration[]>('pendingMedications');
    if (cached) return cached.value;
    throw error;
  }
}

export async function administerMedication(id: number, payload: MedicationAdministrationPayload): Promise<MedicationAdministration> {
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/administer/`, payload, payload.idempotency_key);
}

export async function omitMedication(id: number, payload: { reason: string; notes?: string }): Promise<MedicationAdministration> {
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/omit/`, payload);
}

export async function delayMedication(id: number, payload?: { notes?: string }): Promise<MedicationAdministration> {
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/delay/`, payload ?? {});
}

export async function refuseMedication(id: number, payload: { reason: string; notes?: string }): Promise<MedicationAdministration> {
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/refuse/`, payload);
}

export async function unavailableMedication(id: number, payload: { reason: string; notes?: string }): Promise<MedicationAdministration> {
  return postOrUnavailable<MedicationAdministration>(`/hospitalization/medication-administrations/${id}/unavailable/`, payload);
}
