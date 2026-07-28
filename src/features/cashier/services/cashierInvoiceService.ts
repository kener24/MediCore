import { getFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/cashier/types/commonCashier.types';
import type { CashierInvoice, CashierInvoiceDetail } from '@/features/cashier/types/cashierInvoice.types';

export async function getPendingInvoices(params?: QueryParams): Promise<CashierInvoice[]> {
  const pending = await getFirstAvailable<ApiListResponse<CashierInvoice>>(['/billing/invoices/', '/invoices/'], { status: 'pendiente', ...(params ?? {}) });
  const partial = await getFirstAvailable<ApiListResponse<CashierInvoice>>(['/billing/invoices/', '/invoices/'], { status: 'parcialmente_pagada', ...(params ?? {}) }).catch(() => []);
  return [...normalizeListResponse(pending), ...normalizeListResponse(partial)];
}

export async function getInvoices(params?: QueryParams): Promise<CashierInvoice[]> {
  const data = await getFirstAvailable<ApiListResponse<CashierInvoice>>(['/billing/invoices/', '/invoices/'], params);
  return normalizeListResponse(data);
}

export async function searchInvoices(query: string, filters?: QueryParams): Promise<CashierInvoice[]> {
  const data = await getFirstAvailable<ApiListResponse<CashierInvoice>>(['/billing/invoices/', '/invoices/'], { search: query, ...(filters ?? {}) });
  return normalizeListResponse(data);
}

export async function getInvoiceDetail(invoiceId: number | string): Promise<CashierInvoiceDetail> {
  return getFirstAvailable<CashierInvoiceDetail>([`/billing/invoices/${invoiceId}/`, `/invoices/${invoiceId}/`]);
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<CashierInvoice | null> {
  const results = await searchInvoices(invoiceNumber);
  return results.find((invoice) => invoice.invoice_number === invoiceNumber || invoice.number === invoiceNumber) ?? results[0] ?? null;
}
