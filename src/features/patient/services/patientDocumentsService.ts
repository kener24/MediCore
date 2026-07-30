import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { downloadAndShareAuthenticated } from '@/core/files/authenticatedFile';
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

export async function openPatientDocumentUrl(document: PatientDocument, mode: 'download' | 'preview') {
  const extension = document.file_extension || 'bin';
  const filename = document.original_filename || `documento-${document.id}.${extension}`;
  return downloadAndShareAuthenticated({
    dialogTitle: mode === 'preview' ? 'Abrir documento' : 'Descargar documento',
    filename,
    mimeType: document.mime_type || 'application/octet-stream',
    path: mode === 'download' ? endpoints.patientPortal.documentDownload(document.id) : endpoints.patientPortal.documentPreview(document.id),
  });
}

export async function previewDocument(id: number | string) {
  const document = await getPatientDocument(id);
  await openPatientDocumentUrl(document, 'preview');
}

export async function downloadDocument(id: number | string) {
  const document = await getPatientDocument(id);
  await openPatientDocumentUrl(document, 'download');
}
