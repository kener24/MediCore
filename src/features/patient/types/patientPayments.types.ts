export type PatientPayment = {
  id: number;
  invoice?: number;
  invoice_number?: string;
  patient?: number;
  patient_nombre?: string;
  received_by_nombre?: string;
  payment_number?: string;
  payment_date?: string;
  amount?: string | number;
  method?: string;
  reference?: string | null;
  notes?: string | null;
  status?: string;
  creado_en?: string;
  actualizado_en?: string;
};
