export type InvoiceStatus = "borrador" | "pendiente" | "parcialmente_pagada" | "pagada" | "anulada";
export type FiscalStatus = "draft" | "issued" | "cancelled" | "void";
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "deposito" | "cheque" | "otro";
export type PaymentStatus = "aplicado" | "anulado";
export type CashStatus = "abierta" | "cerrada";

export interface BillableService { id: number; clinic: number; name: string; description: string; code: string; price: string; taxable: boolean; tax_rate: string; active: boolean; }
export type InvoiceItemType = "service" | "inventory_item" | "medication" | "supply" | "procedure" | "consumption" | "manual";
export interface InvoiceItem { id: number; invoice: number; item_type: InvoiceItemType; service: number | null; service_name?: string; inventory_item?: number | null; inventory_item_name?: string; inventory_lot?: number | null; inventory_lot_number?: string; related_consultation?: number | null; related_consumption?: number | null; description: string; quantity: string; unit_price: string; discount_amount: string; discount?: string; tax_type?: "taxed_15" | "taxed_18" | "exempt" | "exonerated"; tax_rate: string; subtotal?: string; tax_amount: string; total?: string; line_total: string; active: boolean; }
export interface Payment { id: number; clinic: number; invoice: number; invoice_number?: string; patient: number; patient_nombre?: string; cash_session: number | null; payment_number: string; payment_date: string; amount: string; method: PaymentMethod; reference: string; notes: string; status: PaymentStatus; received_by_nombre?: string; active: boolean; }
export interface Invoice { id: number; clinic: number; patient: number; patient_nombre?: string; patient_identidad?: string; appointment: number | null; consultation: number | null; invoice_number: string; issue_date: string; due_date: string | null; status: InvoiceStatus; is_fiscal: boolean; fiscal_status: FiscalStatus; fiscal_number?: string | null; cai?: string; fiscal_expiration_date?: string | null; fiscal_range_start?: string; fiscal_range_end?: string; emitter_rtn?: string; emitter_legal_name?: string; customer_name?: string; customer_rtn?: string; subtotal: string; discount_amount: string; tax_amount: string; total_amount: string; subtotal_exempt?: string; subtotal_exonerated?: string; subtotal_taxed_15?: string; subtotal_taxed_18?: string; isv_15?: string; isv_18?: string; paid_amount: string; balance_due: string; amount_in_words?: string; notes?: string; active: boolean; items?: InvoiceItem[]; payments?: Payment[]; }
export interface CashMovement { id: number; clinic: number; cash_session: number; movement_type: "ingreso" | "egreso"; amount: string; reason: string; notes: string; active: boolean; }
export interface CashSession { id: number; clinic: number; opened_by: number; opened_by_nombre?: string; opening_datetime: string; closing_datetime: string | null; opening_amount: string; closing_amount: string | null; expected_amount: string; difference_amount: string; status: CashStatus; notes: string; active: boolean; movements?: CashMovement[]; }
export interface BillingStats { total_invoiced: string; total_paid: string; total_pending: string; pending_invoices: number; paid_invoices: number; partial_invoices: number; voided_invoices: number; today_payments: string; cash_today: string; card_today: string; transfer_today: string; }
export interface TodayInvoiceSummary { date: string; total_invoices: number; total_invoiced: string; total_paid: string; total_balance: string; paid_count: number; pending_count: number; void_count: number; }

export interface InvoicePrintData {
  clinic: {
    id: number;
    name: string;
    logo_url: string;
    fiscal_name: string;
    rtn: string;
    address: string;
    phone: string;
    email: string;
    primary_color: string;
    currency: string;
  };
  invoice: {
    id: number;
    number: string;
    issue_date: string;
    due_date: string | null;
    status: InvoiceStatus;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paid: string;
    balance: string;
    notes: string;
    is_fiscal?: boolean;
    fiscal_status?: FiscalStatus;
    fiscal_number?: string | null;
    cai?: string;
    fiscal_range_start?: string;
    fiscal_range_end?: string;
    fiscal_expiration_date?: string | null;
    subtotal_exempt?: string;
    subtotal_exonerated?: string;
    subtotal_taxed_15?: string;
    subtotal_taxed_18?: string;
    isv_15?: string;
    isv_18?: string;
    amount_in_words?: string;
  };
  patient: {
    id: number;
    full_name: string;
    identity: string;
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  payments: Payment[];
  footer_text: string;
  terms: string;
}

export interface ClinicFiscalProfile { id: number; clinic: number; clinic_nombre?: string; legal_name: string; commercial_name: string; rtn: string; address: string; municipality: string; department: string; phone: string; email: string; economic_activity: string; is_fiscal_billing_enabled: boolean; default_isv_rate: string; secondary_isv_rate: string | null; require_customer_rtn: boolean; fiscal_legend: string; }
export interface FiscalDocumentRange { id: number; clinic: number; clinic_nombre?: string; document_type: "invoice" | "credit_note" | "debit_note" | "receipt"; cai: string; establishment_code: string; emission_point_code: string; document_type_code: string; start_number: number; end_number: number; current_number: number; start_date: string; expiration_date: string; is_active: boolean; is_exhausted: boolean; full_start_number: string; full_end_number: string; available_numbers: number; }
