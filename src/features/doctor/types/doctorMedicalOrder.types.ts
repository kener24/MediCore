export type MedicalOrderType = 'laboratorio' | 'imagen' | 'procedimiento' | 'referencia' | 'otra' | string;
export type MedicalOrderPriority = 'normal' | 'prioritaria' | 'urgente' | string;

export type CreateMedicalOrderPayload = {
  consultation?: number;
  visit?: number;
  order_type: MedicalOrderType;
  description: string;
  priority?: MedicalOrderPriority;
  instructions?: string;
  notes?: string;
};

export type DoctorMedicalOrder = {
  id?: number;
  consultation_id?: number;
  order_type?: MedicalOrderType;
  description?: string;
  priority?: MedicalOrderPriority;
  instructions?: string | null;
  notes?: string | null;
  status?: string;
  created_at?: string;
};
