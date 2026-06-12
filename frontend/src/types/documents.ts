export type DocumentType = "clinical" | "administrative" | "billing" | "identity" | "consent" | "lab_result" | "imaging" | "prescription" | "medical_order" | "other";
export type DocumentStatus = "active" | "archived" | "deleted";

export interface DocumentCategory {
  id: number;
  clinic: number | null;
  clinic_nombre?: string;
  name: string;
  description: string;
  document_type: DocumentType;
  active: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ClinicalDocument {
  id: number;
  clinic: number;
  clinic_nombre?: string;
  patient: number;
  patient_nombre?: string;
  patient_codigo?: string;
  medical_record?: number | null;
  consultation?: number | null;
  appointment?: number | null;
  prescription?: number | null;
  medical_order?: number | null;
  invoice?: number | null;
  category: number | null;
  category_nombre?: string;
  document_type: DocumentType;
  title: string;
  description: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  storage_backend: string;
  uploaded_by?: number | null;
  uploaded_by_nombre?: string;
  visible_to_patient: boolean;
  is_sensitive: boolean;
  status: DocumentStatus;
  version: number;
  replaced_by?: number | null;
  checksum?: string;
  tags: string[];
  notes?: string;
  active: boolean;
  creado_en: string;
  actualizado_en: string;
  file_url?: string | null;
}

export interface DocumentFilters {
  patient?: string;
  medical_record?: string;
  consultation?: string;
  appointment?: string;
  prescription?: string;
  medical_order?: string;
  invoice?: string;
  category?: string;
  document_type?: string;
  visible_to_patient?: string;
  is_sensitive?: string;
  status?: string;
  active?: string;
  date_from?: string;
  date_to?: string;
  uploaded_by?: string;
  clinic?: string;
  search?: string;
  ordering?: string;
}

export interface DocumentStats {
  total_documents: number;
  active_documents: number;
  archived_documents: number;
  deleted_documents: number;
  visible_to_patient: number;
  sensitive_documents: number;
  total_storage_mb: number;
  documents_by_type: Array<{ category__document_type: string | null; count: number }>;
}

export interface DocumentUploadPayload {
  patient?: string | number;
  medical_record?: string | number;
  consultation?: string | number;
  appointment?: string | number;
  prescription?: string | number;
  medical_order?: string | number;
  invoice?: string | number;
  category?: string | number;
  title?: string;
  description?: string;
  file: File;
  visible_to_patient?: boolean;
  is_sensitive?: boolean;
  tags?: string[];
  notes?: string;
}

