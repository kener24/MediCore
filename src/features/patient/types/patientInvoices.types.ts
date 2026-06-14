export type PatientInvoiceStatus =
  | 'borrador'
  | 'pendiente'
  | 'parcialmente_pagada'
  | 'pagada'
  | 'anulada'
  | string;

export type PatientInvoiceItem = {
  id?: number;
  description?: string;
  service_name?: string;
  quantity?: string;
  unit_price?: string;
  discount_amount?: string;
  tax_amount?: string;
  line_total?: string;
};

export type PatientInvoicePayment = {
  id?: number;
  payment_number?: string;
  payment_date?: string;
  amount?: string;
  method?: string;
  reference?: string;
  status?: string;
};

export type PatientInvoice = {
  id: number;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string | null;
  status?: PatientInvoiceStatus;
  subtotal?: string;
  discount_amount?: string;
  tax_amount?: string;
  total_amount?: string;
  paid_amount?: string;
  balance_due?: string;
  notes?: string;
  items?: PatientInvoiceItem[];
  payments?: PatientInvoicePayment[];
};

export type PatientInvoiceFilter = 'all' | 'pending' | 'paid';
