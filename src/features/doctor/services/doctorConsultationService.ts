import { apiClient } from '@/core/api/apiClient';
import { ApiClientError } from '@/core/api/authInterceptor';
import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type {
  ConsultationPayload,
  DoctorConsultation,
  DoctorPatientSummary,
  DoctorVitalSigns,
  StartConsultationResponse,
} from '@/features/doctor/types/doctorConsultation.types';

const unavailableMessage = 'El módulo de consulta aún no está disponible.';

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
  return getFirstAvailable<DoctorConsultation>([endpoints.doctor.consultation(consultationId)]);
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
    throw err;
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

export async function completeConsultation(visitId: number | string, payload?: ConsultationPayload) {
  return postFirstAvailable<DoctorConsultation>(
    [endpoints.doctor.completeConsultation(visitId)],
    payload ? sanitizePayload(payload) : undefined,
  );
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
    if (err.status === 404) return new Error('No se encontró la consulta.');
    if (err.status && err.status >= 500) return new Error('Ocurrió un error en el servidor.');
    return err;
  }
  return err instanceof Error ? err : new Error(unavailableMessage);
}

function shouldRetryWithoutStatus(err: unknown, payload: ConsultationPayload) {
  return Boolean(payload.status && err instanceof ApiClientError && err.status === 400);
}
