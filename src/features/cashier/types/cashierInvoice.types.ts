import type { CashierPayment } from '@/features/cashier/types/cashierPayment.types';

export type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled' | 'void' | string;

export type CashierInvoice = {
  id?: number;
  invoice_number?: string;
  number?: string;
  patient_id?: number;
  patient_name?: string;
  patient_identity?: string;
  patient_phone?: string;
  visit_id?: number | null;
  consultation_id?: number | null;
  hospitalization_id?: number | null;
  status?: InvoiceStatus;
  subtotal?: number | string;
  discount?: number | string;
  discount_total?: number | string;
  tax?: number | string;
  tax_total?: number | string;
  total?: number | string;
  total_amount?: number | string;
  amount_paid?: number | string;
  paid_amount?: number | string;
  balance_due?: number | string;
  balance?: number | string;
  currency?: string;
  created_at?: string;
  issued_at?: string;
  issue_date?: string;
  due_date?: string | null;
};

export type CashierInvoiceItem = {
  id?: number;
  description?: string;
  quantity?: number | string;
  unit_price?: number | string;
  subtotal?: number | string;
  tax?: number | string;
  total?: number | string;
};

export type CashierInvoiceDetail = CashierInvoice & {
  items?: CashierInvoiceItem[];
  payments?: CashierPayment[];
  notes?: string | null;
};
