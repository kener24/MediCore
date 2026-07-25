export type MedicalOrderType = 'laboratorio' | 'imagenologia' | 'procedimiento' | 'interconsulta' | 'otro' | string;
export type MedicalOrderPriority = 'baja' | 'normal' | 'alta' | 'urgente' | string;

export type CreateMedicalOrderPayload = {
  consultation?: number;
  visit?: number;
  order_type: MedicalOrderType;
  description: string;
  priority?: MedicalOrderPriority;
  instructions?: string;
  notes?: string;
  title?: string;
  expires_at?: string | null;
  scheduled_at?: string | null;
  execution_area?: string;
};

export type DoctorMedicalOrder = {
  id?: number;
  order_number?: string;
  consultation_id?: number;
  order_type?: MedicalOrderType;
  description?: string;
  priority?: MedicalOrderPriority;
  instructions?: string | null;
  notes?: string | null;
  status?: string;
  title?: string;
  expires_at?: string | null;
  scheduled_at?: string | null;
  responsible_user?: number | null;
  execution_area?: string;
  started_at?: string | null;
  completed_at?: string | null;
  result_summary?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
};
