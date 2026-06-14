export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'void'
  | 'borrador'
  | 'pendiente'
  | 'parcialmente_pagada'
  | 'pagada'
  | 'anulada'
  | string;

export type PatientInvoiceStatus = InvoiceStatus;

export type PatientInvoiceItem = {
  id?: number;
  description?: string;
  item_name?: string;
  service_name?: string;
  quantity?: string | number;
  unit_price?: string | number;
  discount?: string | number;
  discount_amount?: string | number;
  tax?: string | number;
  tax_amount?: string | number;
  total?: string | number;
  line_total?: string | number;
};

export type InvoiceItem = PatientInvoiceItem;

export type PatientInvoicePayment = {
  id?: number;
  payment_number?: string;
  payment_date?: string;
  amount?: string | number;
  method?: string;
  payment_method?: string;
  reference?: string | null;
  status?: string;
};

export type InvoicePayment = PatientInvoicePayment;

export type PatientInvoice = {
  id: number;
  clinic_name?: string;
  patient_name?: string;
  invoice_number?: string;
  issue_date?: string;
  created_at?: string;
  due_date?: string | null;
  status?: PatientInvoiceStatus;
  subtotal?: string | number;
  discount_total?: string | number;
  discount_amount?: string | number;
  tax_total?: string | number;
  tax_amount?: string | number;
  total?: string | number;
  total_amount?: string | number;
  paid_amount?: string | number;
  balance?: string | number;
  balance_due?: string | number;
  notes?: string | null;
  pdf_url?: string | null;
  file_url?: string | null;
  items?: PatientInvoiceItem[];
  payments?: PatientInvoicePayment[];
};

export type PatientInvoiceDetail = PatientInvoice;

export type PatientInvoiceFilter = 'all' | 'pending' | 'paid';
