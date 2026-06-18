import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';
import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ConsultationFiltersState,
  ConsultationPayload,
  DoctorConsultation,
  DoctorPatientSummary,
  DoctorVitalSigns,
  StartConsultationResponse,
} from '@/features/doctor/types/doctorConsultation.types';

const unavailableMessage = 'El módulo de consultas aún no está disponible completamente.';

export async function getDoctorConsultations(params?: ConsultationFiltersState & Record<string, string | number | undefined>) {
  try {
    const data = await getFirstAvailable<ApiListResponse<DoctorConsultation>>(
      [endpoints.doctor.consultations],
      { params: normalizeConsultationParams(params) },
    );
    return normalizeListResponse(data);
  } catch (err) {
    throw normalizeConsultationError(err);
  }
}

export function getTodayConsultations() {
  return getDoctorConsultations({ date: todayString() });
}

export function getConsultationsInProgress() {
  return getDoctorConsultations({ status: 'in_progress' });
}

export function getCompletedConsultations(params?: ConsultationFiltersState) {
  return getDoctorConsultations({ ...params, status: 'completed' });
}

export async function getPatientConsultationHistory(patientId: number | string) {
  try {
    const data = await getFirstAvailable<ApiListResponse<DoctorConsultation>>(
      [
        endpoints.doctor.patientConsultations(patientId),
        endpoints.doctor.patientConsultationsAlt(patientId),
        endpoints.doctor.consultations,
      ],
      { params: { patient: patientId } },
    );
    return normalizeListResponse(data);
  } catch (err) {
    throw normalizeConsultationError(err);
  }
}

export async function getConsultationRelatedData(consultationId: number | string) {
  const [prescriptions, medicalOrders, consumptions] = await Promise.all([
    getFirstAvailable<ApiListResponse<unknown>>(
      [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions],
      { params: { consultation: consultationId } },
    ).then(normalizeListResponse).catch(() => []),
    getFirstAvailable<ApiListResponse<unknown>>(
      [endpoints.doctor.consultationMedicalOrders(consultationId), endpoints.doctor.medicalOrders],
      { params: { consultation: consultationId } },
    ).then(normalizeListResponse).catch(() => []),
    getFirstAvailable<ApiListResponse<unknown>>(
      [endpoints.doctor.consultationConsumptions(consultationId), endpoints.doctor.clinicalConsumptions],
      { params: { consultation: consultationId } },
    ).then(normalizeListResponse).catch(() => []),
  ]);
  return { consumptions, medical_orders: medicalOrders, prescriptions };
}

export async function getVisitDetail(visitId: number | string) {
  return getFirstAvailable<Record<string, unknown>>([
    endpoints.doctor.visit(visitId),
    endpoints.doctor.visitAlt(visitId),
  ]);
}

export async function getDoctorPatientSummary(patientId: number | string) {
  return getFirstAvailable<DoctorPatientSummary>([
    endpoints.doctor.patientSummary(patientId),
    endpoints.doctor.patientSummaryAlt(patientId),
  ]);
}

export async function getVisitVitalSigns(visitId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorVitalSigns> | DoctorVitalSigns>(
    [endpoints.doctor.vitalSigns(visitId), endpoints.doctor.vitalSignsAlt],
    { params: { visit: visitId } },
  );
  const list = normalizeListResponse(data as ApiListResponse<DoctorVitalSigns>);
  return list[0] ?? (data as DoctorVitalSigns);
}

export async function startConsultation(visitId: number | string) {
  return postFirstAvailable<StartConsultationResponse>([endpoints.doctor.startConsultation(visitId)]);
}

export async function getConsultationDetail(consultationId: number | string) {
  try {
    return await getFirstAvailable<DoctorConsultation>([endpoints.doctor.consultation(consultationId)]);
  } catch (err) {
    throw normalizeConsultationError(err);
  }
}

export async function getConsultation(id: number | string) {
  return getConsultationDetail(id);
}

export async function getConsultationByVisit(visitId: number | string) {
  try {
    const data = await getFirstAvailable<ApiListResponse<DoctorConsultation> | DoctorConsultation>(
      [endpoints.doctor.consultations],
      { params: { visit: visitId } },
    );
    const list = normalizeListResponse(data as ApiListResponse<DoctorConsultation>);
    return list[0] ?? (isConsultationObject(data) ? data : null);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw normalizeConsultationError(err);
  }
}

export async function createConsultation(payload: ConsultationPayload) {
  try {
    const { data } = await apiClient.post<DoctorConsultation>(endpoints.doctor.consultations, sanitizePayload(payload));
    return data;
  } catch (err) {
    if (shouldRetryWithoutStatus(err, payload)) {
      const { data } = await apiClient.post<DoctorConsultation>(
        endpoints.doctor.consultations,
        sanitizePayload({ ...payload, status: undefined }),
      );
      return data;
    }
    throw normalizeConsultationError(err);
  }
}

export async function updateConsultation(consultationId: number | string, payload: ConsultationPayload) {
  try {
    return await patchFirstAvailable<DoctorConsultation>(
      [endpoints.doctor.consultation(consultationId)],
      sanitizePayload(payload),
    );
  } catch (err) {
    if (err instanceof ApiClientError && [404, 405].includes(err.status ?? 0)) {
      try {
        const { data } = await apiClient.put<DoctorConsultation>(
          endpoints.doctor.consultation(consultationId),
          sanitizePayload(payload),
        );
        return data;
      } catch (putErr) {
        if (shouldRetryWithoutStatus(putErr, payload)) {
          const { data } = await apiClient.put<DoctorConsultation>(
            endpoints.doctor.consultation(consultationId),
            sanitizePayload({ ...payload, status: undefined }),
          );
          return data;
        }
        throw normalizeConsultationError(putErr);
      }
    }
    if (shouldRetryWithoutStatus(err, payload)) {
      return patchFirstAvailable<DoctorConsultation>(
        [endpoints.doctor.consultation(consultationId)],
        sanitizePayload({ ...payload, status: undefined }),
      );
    }
    throw normalizeConsultationError(err);
  }
}

export async function saveConsultationDraft(consultationId: number | string, payload: ConsultationPayload) {
  const draftPayload = sanitizePayload({ ...payload, status: 'draft' });
  try {
    return await postFirstAvailable<DoctorConsultation>(
      [`${endpoints.doctor.consultation(consultationId)}save-draft/`],
      draftPayload,
    );
  } catch (err) {
    if (err instanceof ApiClientError && [404, 405].includes(err.status ?? 0)) {
      return updateConsultation(consultationId, draftPayload);
    }
    throw normalizeConsultationError(err);
  }
}

export const saveDraft = saveConsultationDraft;

export async function completeConsultation(visitId: number | string, payload?: ConsultationPayload) {
  return postFirstAvailable<DoctorConsultation>(
    [endpoints.doctor.completeConsultation(visitId)],
    payload ? sanitizePayload(payload) : undefined,
  );
}

export async function completeConsultationById(consultationId: number | string, payload?: ConsultationPayload) {
  try {
    return await postFirstAvailable<DoctorConsultation>(
      [`${endpoints.doctor.consultation(consultationId)}complete/`],
      payload ? sanitizePayload(payload) : undefined,
    );
  } catch {
    return updateConsultation(consultationId, { ...(payload ?? {}), status: 'completed' });
  }
}

export function sanitizePayload(payload: ConsultationPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  ) as ConsultationPayload;
}

function isConsultationObject(value: unknown): value is DoctorConsultation {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeConsultationError(err: unknown) {
  if (err instanceof ApiClientError) {
    if (err.status === 403) return new Error('No tienes permiso para ver esta consulta.');
    if (err.status === 404) return new Error(unavailableMessage);
    if (err.status && err.status >= 500) return new Error('Ocurrió un error en el servidor.');
    return err;
  }
  return err instanceof Error ? err : new Error(unavailableMessage);
}

function shouldRetryWithoutStatus(err: unknown, payload: ConsultationPayload) {
  return Boolean(payload.status && err instanceof ApiClientError && err.status === 400);
}

function normalizeConsultationParams(params?: ConsultationFiltersState & Record<string, string | number | undefined>) {
  const normalized = { ...(params ?? {}) };
  if (normalized.status === 'all') delete normalized.status;
  if (!normalized.search) delete normalized.search;
  if (!normalized.date) delete normalized.date;
  return normalized;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}
