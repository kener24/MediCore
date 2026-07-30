import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { downloadAndShareAuthenticated } from '@/core/files/authenticatedFile';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';

export async function getPatientPrescriptions(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientPrescription>>(
    endpoints.patientPortal.prescriptions,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientPrescription(id: number | string) {
  const { data } = await apiClient.get<PatientPrescription>(
    endpoints.patientPortal.prescription(id),
  );
  return data;
}

export const getPrescriptionDetail = getPatientPrescription;

export async function openPatientPrescriptionPdf(id: number | string, prescriptionNumber?: string) {
  return downloadAndShareAuthenticated({
    dialogTitle: 'Receta médica',
    filename: `receta-${prescriptionNumber || id}.pdf`,
    mimeType: 'application/pdf',
    path: endpoints.patientPortal.prescriptionPdf(id),
  });
}
