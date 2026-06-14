import { Linking } from 'react-native';

import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { appConfig } from '@/core/config/appConfig';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';

export async function getPatientDocuments(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientDocument>>(
    endpoints.patientPortal.documents,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientDocument(id: number | string) {
  const { data } = await apiClient.get<PatientDocument>(endpoints.patientPortal.document(id));
  return data;
}

export const getDocumentDetail = getPatientDocument;

export function getPatientDocumentFileUrl(id: number | string, mode: 'download' | 'preview') {
  const path =
    mode === 'download'
      ? endpoints.patientPortal.documentDownload(id)
      : endpoints.patientPortal.documentPreview(id);
  return `${appConfig.API_BASE_URL}${path}`;
}

function toAbsoluteUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${appConfig.API_BASE_URL.replace('/api', '')}${url}`;
  return url;
}

export async function openPatientDocumentUrl(document: PatientDocument, mode: 'download' | 'preview') {
  const explicitUrl = mode === 'preview' ? document.preview_url : document.download_url;
  const url = toAbsoluteUrl(explicitUrl || document.file_url || document.file || getPatientDocumentFileUrl(document.id, mode));
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('No se pudo abrir el documento.');
  }
  await Linking.openURL(url);
}

export async function previewDocument(id: number | string) {
  await Linking.openURL(getPatientDocumentFileUrl(id, 'preview'));
}

export async function downloadDocument(id: number | string) {
  await Linking.openURL(getPatientDocumentFileUrl(id, 'download'));
}
