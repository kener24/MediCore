export type InvoiceStatus = "borrador" | "pendiente" | "parcialmente_pagada" | "pagada" | "anulada";
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "deposito" | "cheque" | "otro";
export type PaymentStatus = "aplicado" | "anulado";
export type CashStatus = "abierta" | "cerrada";

export interface BillableService { id: number; clinic: number; name: string; description: string; code: string; price: string; taxable: boolean; tax_rate: string; active: boolean; }
export type InvoiceItemType = "service" | "inventory_item" | "medication" | "supply" | "procedure" | "consumption" | "manual";
export interface InvoiceItem { id: number; invoice: number; item_type: InvoiceItemType; service: number | null; service_name?: string; inventory_item?: number | null; inventory_item_name?: string; inventory_lot?: number | null; inventory_lot_number?: string; related_consultation?: number | null; related_consumption?: number | null; description: string; quantity: string; unit_price: string; discount_amount: string; tax_rate: string; tax_amount: string; line_total: string; active: boolean; }
export interface Payment { id: number; clinic: number; invoice: number; invoice_number?: string; patient: number; patient_nombre?: string; cash_session: number | null; payment_number: string; payment_date: string; amount: string; method: PaymentMethod; reference: string; notes: string; status: PaymentStatus; received_by_nombre?: string; active: boolean; }
export interface Invoice { id: number; clinic: number; patient: number; patient_nombre?: string; patient_identidad?: string; appointment: number | null; consultation: number | null; invoice_number: string; issue_date: string; due_date: string | null; status: InvoiceStatus; subtotal: string; discount_amount: string; tax_amount: string; total_amount: string; paid_amount: string; balance_due: string; notes?: string; active: boolean; items?: InvoiceItem[]; payments?: Payment[]; }
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
