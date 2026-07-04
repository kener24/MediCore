import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';

export type DoctorClinicalDocument = {
  id?: number;
  title?: string;
  description?: string | null;
  original_filename?: string;
  file_extension?: string;
  document_type?: string;
  category_name?: string;
  visible_to_patient?: boolean;
  creado_en?: string;
  created_at?: string;
  download_url?: string;
  preview_url?: string;
};

export async function getMedicalOrderDocuments(orderId: number | string) {
  const data = await getFirstAvailable<ApiListResponse<DoctorClinicalDocument>>([
    endpoints.doctor.medicalOrderDocuments(orderId),
  ]);
  return normalizeListResponse(data);
}
