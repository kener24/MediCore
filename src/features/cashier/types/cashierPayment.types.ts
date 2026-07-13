export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'deposito' | 'cheque' | 'otro' | string;

export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed' | string;

export type CashierPayment = {
  id?: number;
  invoice_id?: number;
  invoice_number?: string;
  patient_name?: string;
  amount?: number | string;
  method?: PaymentMethod;
  payment_method?: PaymentMethod;
  status?: PaymentStatus;
  reference?: string;
  notes?: string;
  received_by_name?: string;
  paid_at?: string;
  payment_date?: string;
  created_at?: string;
};

export type RegisterPaymentPayload = {
  invoice_id: number;
  amount: number | string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  cash_session?: number;
};
