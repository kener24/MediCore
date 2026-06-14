export type PatientDocument = {
  id: number;
  title?: string;
  category?: number | string;
  category_name?: string;
  description?: string;
  file?: string;
  file_url?: string;
  original_filename?: string;
  file_type?: string;
  mime_type?: string;
  file_extension?: string;
  uploaded_by_name?: string;
  status?: string;
  visible_to_patient?: boolean;
  creado_en?: string;
  actualizado_en?: string;
};
