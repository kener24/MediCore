import { endpoints } from '@/core/api/endpoints';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appConfig } from '@/core/config/appConfig';
import { getSession } from '@/core/storage/sessionStorage';
import { getFirstAvailable, patchFirstAvailable, postFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { CreatePrescriptionPayload, DoctorPrescription } from '@/features/doctor/types/doctorPrescription.types';

export async function getConsultationPrescriptions(consultationId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorPrescription>>(
    [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions],
    { params: { consultation: consultationId } },
  );
  return normalizeListResponse(data);
}

export async function createPrescription(consultationId: number | string, payload: CreatePrescriptionPayload) {
  return postFirstAvailable<DoctorPrescription>(
    [endpoints.doctor.consultationPrescriptions(consultationId), endpoints.doctor.prescriptions],
    { ...payload, consultation: Number(consultationId) },
  );
}

export async function getPrescriptionDetail(id: number | string) {
  return getFirstAvailable<DoctorPrescription>([`${endpoints.doctor.prescriptions}${id}/`]);
}

export async function issueDoctorPrescription(id: number | string, payload?: { confirm_allergies?: boolean; allergy_override_reason?: string }) {
  return patchFirstAvailable<DoctorPrescription>([`${endpoints.doctor.prescriptions}${id}/issue/`], payload);
}

export async function cancelDoctorPrescription(id: number | string, reason: string) {
  return patchFirstAvailable<DoctorPrescription>([`${endpoints.doctor.prescriptions}${id}/void/`], { reason });
}

export async function sharePrescriptionPdf(id: number | string, prescriptionNumber?: string) {
  const session = await getSession();
  if (!session.accessToken || !FileSystem.cacheDirectory) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  const filename = `receta-${prescriptionNumber || id}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  const result = await FileSystem.downloadAsync(
    `${appConfig.API_BASE_URL}${endpoints.doctor.prescriptions}${id}/pdf/`,
    `${FileSystem.cacheDirectory}${filename}`,
    { headers: { Authorization: `Bearer ${session.accessToken}`, ...(session.sessionKey ? { 'X-Session-Key': session.sessionKey } : {}) } },
  );
  if (result.status !== 200) throw new Error('No se pudo descargar el PDF de la receta.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite abrir o compartir el PDF.');
  await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Receta médica' });
}

export const createDoctorPrescription = (payload: CreatePrescriptionPayload, consultationId?: number | string) =>
  consultationId ? createPrescription(consultationId, payload) : postFirstAvailable<DoctorPrescription>([endpoints.doctor.prescriptions], payload);
