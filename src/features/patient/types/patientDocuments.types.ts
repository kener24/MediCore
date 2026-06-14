export type PatientDocument = {
  id: number;
  title?: string;
  category?: number | string;
  category_name?: string;
  description?: string | null;
  file?: string;
  file_url?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  original_filename?: string;
  file_type?: string;
  mime_type?: string;
  file_extension?: string;
  uploaded_by_name?: string;
  notes?: string | null;
  patient_name?: string;
  clinic_name?: string;
  status?: string;
  visible_to_patient?: boolean;
  created_at?: string;
  creado_en?: string;
  actualizado_en?: string;
};

export type PatientDocumentDetail = PatientDocument;
