import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/reception/services/receptionApiHelpers';
import { mapMinimalPatientPayload } from '@/features/reception/services/receptionMappers';
import { normalizeListResponse, type ApiListResponse } from '@/features/reception/types/commonReception.types';
import type { MinimalPatientPayload, ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

export async function searchPatients(query: string): Promise<ReceptionPatient[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const data = await getFirstAvailable<ApiListResponse<ReceptionPatient>>(['/patients/', '/reception/patients/search/'], { search: term });
  return normalizeListResponse<ReceptionPatient>(data);
}

export async function getPatientDetail(patientId: number | string): Promise<ReceptionPatient> {
  return getFirstAvailable<ReceptionPatient>([`/patients/${patientId}/`]);
}

export async function createMinimalPatient(payload: MinimalPatientPayload): Promise<ReceptionPatient> {
  return postFirstAvailable<ReceptionPatient>(['/reception/patients/minimal/', '/patients/'], mapMinimalPatientPayload(payload));
}

export async function updateBasicPatient(patientId: number | string, payload: MinimalPatientPayload): Promise<ReceptionPatient> {
  return patchFirstAvailable<ReceptionPatient>([`/patients/${patientId}/`], mapMinimalPatientPayload(payload));
}
