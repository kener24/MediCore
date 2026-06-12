import api from "./axios";
import type { ClinicalDocument, DocumentCategory, DocumentFilters, DocumentStats, DocumentUploadPayload } from "../types/documents";

function toFormData(payload: Partial<DocumentUploadPayload>) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "tags" && Array.isArray(value)) {
      value.forEach((tag) => form.append("tags", tag));
    } else {
      form.append(key, value as Blob | string);
    }
  });
  return form;
}

export async function getDocumentCategories(filters?: Record<string, string>) { const { data } = await api.get<DocumentCategory[]>("/documents/categories/", { params: filters }); return data; }
export async function getDocumentCategory(id: number | string) { const { data } = await api.get<DocumentCategory>(`/documents/categories/${id}/`); return data; }
export async function createDocumentCategory(payload: Partial<DocumentCategory>) { const { data } = await api.post<DocumentCategory>("/documents/categories/", payload); return data; }
export async function updateDocumentCategory(id: number | string, payload: Partial<DocumentCategory>) { const { data } = await api.patch<DocumentCategory>(`/documents/categories/${id}/`, payload); return data; }
export async function deleteDocumentCategory(id: number | string) { await api.delete(`/documents/categories/${id}/`); }

export async function getDocuments(filters?: DocumentFilters) { const { data } = await api.get<ClinicalDocument[]>("/documents/", { params: filters }); return data; }
export async function getDocument(id: number | string) { const { data } = await api.get<ClinicalDocument>(`/documents/${id}/`); return data; }
export async function uploadDocument(payload: DocumentUploadPayload) { const { data } = await api.post<ClinicalDocument>("/documents/", toFormData(payload), { headers: { "Content-Type": "multipart/form-data" } }); return data; }
export async function updateDocument(id: number | string, payload: Partial<ClinicalDocument>) { const { data } = await api.patch<ClinicalDocument>(`/documents/${id}/`, payload); return data; }
export async function archiveDocument(id: number | string) { const { data } = await api.patch<ClinicalDocument>(`/documents/${id}/archive/`); return data; }
export async function restoreDocument(id: number | string) { const { data } = await api.patch<ClinicalDocument>(`/documents/${id}/restore/`); return data; }
export async function markDocumentVisibleToPatient(id: number | string) { const { data } = await api.patch<ClinicalDocument>(`/documents/${id}/mark-visible-to-patient/`); return data; }
export async function markDocumentHiddenFromPatient(id: number | string) { const { data } = await api.patch<ClinicalDocument>(`/documents/${id}/mark-hidden-from-patient/`); return data; }
export async function replaceDocument(id: number | string, payload: DocumentUploadPayload) { const { data } = await api.post<ClinicalDocument>(`/documents/${id}/replace/`, toFormData(payload), { headers: { "Content-Type": "multipart/form-data" } }); return data; }
export async function getDocumentStats(filters?: DocumentFilters) { const { data } = await api.get<DocumentStats>("/documents/stats/", { params: filters }); return data; }

export function documentDownloadUrl(id: number | string) { return `${api.defaults.baseURL}/documents/${id}/download/`; }
export function documentPreviewUrl(id: number | string) { return `${api.defaults.baseURL}/documents/${id}/preview/`; }
export async function openDocumentFile(id: number | string, mode: "download" | "preview", filename = "documento") {
  const { data } = await api.get<Blob>(`/documents/${id}/${mode}/`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  if (mode === "download") link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function getPatientDocuments(patientId: number | string, filters?: DocumentFilters) { const { data } = await api.get<ClinicalDocument[]>(`/patients/${patientId}/documents/`, { params: filters }); return data; }
export async function uploadPatientDocument(patientId: number | string, payload: DocumentUploadPayload) { const { data } = await api.post<ClinicalDocument>(`/patients/${patientId}/documents/`, toFormData(payload), { headers: { "Content-Type": "multipart/form-data" } }); return data; }
export async function getMedicalRecordDocuments(recordId: number | string, filters?: DocumentFilters) { const { data } = await api.get<ClinicalDocument[]>(`/medical-records/${recordId}/documents/`, { params: filters }); return data; }
export async function getConsultationDocuments(consultationId: number | string, filters?: DocumentFilters) { const { data } = await api.get<ClinicalDocument[]>(`/consultations/${consultationId}/documents/`, { params: filters }); return data; }

export async function getPatientPortalDocuments(filters?: DocumentFilters) { const { data } = await api.get<ClinicalDocument[]>("/patient-portal/documents/", { params: filters }); return data; }
export async function getPatientPortalDocument(id: number | string) { const { data } = await api.get<ClinicalDocument>(`/patient-portal/documents/${id}/`); return data; }
export function patientPortalDocumentDownloadUrl(id: number | string) { return `${api.defaults.baseURL}/patient-portal/documents/${id}/download/`; }
export function patientPortalDocumentPreviewUrl(id: number | string) { return `${api.defaults.baseURL}/patient-portal/documents/${id}/preview/`; }
export async function openPatientPortalDocumentFile(id: number | string, mode: "download" | "preview", filename = "documento") {
  const { data } = await api.get<Blob>(`/patient-portal/documents/${id}/${mode}/`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  if (mode === "download") link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
