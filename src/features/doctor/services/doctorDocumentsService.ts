import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { appConfig } from '@/core/config/appConfig';
import { getSession } from '@/core/storage/sessionStorage';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';

export type DoctorClinicalDocument = {
  id?: number;
  title?: string;
  description?: string | null;
  original_filename?: string;
  file_extension?: string;
  mime_type?: string;
  document_type?: string;
  category_name?: string;
  category_nombre?: string;
  visible_to_patient?: boolean;
  creado_en?: string;
  created_at?: string;
  download_url?: string;
  preview_url?: string | null;
};

export async function getMedicalOrderDocuments(orderId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorClinicalDocument>>([endpoints.doctor.medicalOrderDocuments(orderId)]);
  return normalizeListResponse(data);
}

export async function getConsultationDocuments(consultationId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorClinicalDocument>>([endpoints.doctor.consultationDocuments(consultationId)]);
  return normalizeListResponse(data);
}

export async function uploadConsultationDocument(consultationId: number | string, asset: DocumentPickerAsset, options: { title?: string; visibleToPatient?: boolean }) {
  const form = new FormData();
  form.append('title', options.title?.trim() || asset.name);
  form.append('visible_to_patient', options.visibleToPatient ? 'true' : 'false');
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' } as unknown as Blob);
  const { data } = await apiClient.post<DoctorClinicalDocument>(endpoints.doctor.consultationDocuments(consultationId), form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 45000 });
  return data;
}

export async function setDocumentPatientVisibility(id: number | string, visible: boolean) {
  const action = visible ? 'mark-visible-to-patient' : 'mark-hidden-from-patient';
  const { data } = await apiClient.patch<DoctorClinicalDocument>(`/documents/${id}/${action}/`, {});
  return data;
}

export async function shareClinicalDocument(document: DoctorClinicalDocument) {
  if (!document.id || !FileSystem.cacheDirectory) throw new Error('El documento no está disponible.');
  const session = await getSession();
  if (!session.accessToken) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  const filename = (document.original_filename || `documento-${document.id}`).replace(/[^a-zA-Z0-9._-]/g, '-');
  const result = await FileSystem.downloadAsync(
    `${appConfig.API_BASE_URL}${endpoints.doctor.documentDownload(document.id)}`,
    `${FileSystem.cacheDirectory}${filename}`,
    { headers: { Authorization: `Bearer ${session.accessToken}`, ...(session.sessionKey ? { 'X-Session-Key': session.sessionKey } : {}) } },
  );
  if (result.status !== 200) throw new Error('No se pudo descargar el documento.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite abrir o compartir documentos.');
  await Sharing.shareAsync(result.uri, { mimeType: document.mime_type || 'application/octet-stream', dialogTitle: document.title || 'Documento clínico' });
}
