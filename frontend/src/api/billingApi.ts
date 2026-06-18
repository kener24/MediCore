import api from "./axios";
import type { BillableService, BillingStats, CashMovement, CashSession, ClinicFiscalProfile, FiscalDocumentRange, Invoice, InvoiceItem, InvoicePrintData, Payment, TodayInvoiceSummary } from "../types/billing";
import type { ClinicalSupplyUsage } from "../types/medicalRecord";

export async function getBillableServices(filters?: Record<string, string>) { const { data } = await api.get<BillableService[]>("/billing/services/", { params: filters }); return data; }
export async function createBillableService(payload: Partial<BillableService>) { const { data } = await api.post<BillableService>("/billing/services/", payload); return data; }
export async function updateBillableService(id: number | string, payload: Partial<BillableService>) { const { data } = await api.patch<BillableService>(`/billing/services/${id}/`, payload); return data; }
export async function deleteBillableService(id: number | string) { await api.delete(`/billing/services/${id}/`); }

export async function getInvoices(filters?: Record<string, string>) { const { data } = await api.get<Invoice[]>("/billing/invoices/", { params: filters }); return data; }
export async function getTodayInvoices() { return getInvoices({ today: "true" }); }
export async function getTodayInvoiceSummary(filters?: Record<string, string>) { const { data } = await api.get<TodayInvoiceSummary>("/billing/invoices/today-summary/", { params: filters }); return data; }
export async function getInvoice(id: number | string) { const { data } = await api.get<Invoice>(`/billing/invoices/${id}/`); return data; }
export async function getInvoicePrintData(id: number | string) { const { data } = await api.get<InvoicePrintData>(`/billing/invoices/${id}/print-data/`); return data; }
export async function getFiscalInvoicePrintData(id: number | string) { const { data } = await api.get<InvoicePrintData>(`/billing/invoices/${id}/fiscal-print-data/`); return data; }
export async function getInvoicePdf(id: number | string) { const { data } = await api.get(`/billing/invoices/${id}/pdf/`, { responseType: "blob" }); return data; }
export async function getFiscalInvoicePdf(id: number | string) { const { data } = await api.get<Blob>(`/billing/invoices/${id}/fiscal-pdf/`, { responseType: "blob" }); return data; }
export async function createInvoice(payload: Omit<Partial<Invoice>, "items"> & { items?: Array<Partial<InvoiceItem>> }) { const { data } = await api.post<Invoice>("/billing/invoices/", payload); return data; }
export async function updateInvoice(id: number | string, payload: Partial<Invoice>) { const { data } = await api.patch<Invoice>(`/billing/invoices/${id}/`, payload); return data; }
export async function voidInvoice(id: number | string, reason: string) { const { data } = await api.patch<Invoice>(`/billing/invoices/${id}/void/`, { reason }); return data; }
export async function issueFiscalInvoice(id: number | string) { const { data } = await api.post<Invoice>(`/billing/invoices/${id}/issue-fiscal/`, { confirm: true }); return data; }
export async function cancelFiscalInvoice(id: number | string, reason: string) { const { data } = await api.post<Invoice>(`/billing/invoices/${id}/cancel-fiscal/`, { reason }); return data; }
export async function createInvoiceItem(invoiceId: number | string, payload: Partial<InvoiceItem>) { const { data } = await api.post<InvoiceItem>(`/billing/invoices/${invoiceId}/items/`, payload); return data; }
export async function getInvoicePayments(invoiceId: number | string) { const { data } = await api.get<Payment[]>(`/billing/invoices/${invoiceId}/payments/`); return data; }
export async function getPendingConsumptions(filters?: Record<string, string>) { const { data } = await api.get<ClinicalSupplyUsage[]>("/billing/pending-consumptions/", { params: filters }); return data; }
export async function addConsumptionToInvoice(invoiceId: number | string, consumptionId: number | string) { const { data } = await api.post<InvoiceItem>(`/billing/invoices/${invoiceId}/add-consumption/`, { consumption_id: consumptionId }); return data; }
export async function addInventoryItemToInvoice(invoiceId: number | string, payload: { inventory_item: number | string; inventory_lot?: number | string | null; quantity: string; description?: string; unit_price?: string; item_type?: string }) { const { data } = await api.post<InvoiceItem>(`/billing/invoices/${invoiceId}/add-inventory-item/`, payload); return data; }
export async function getMyInvoices() { const { data } = await api.get<Invoice[]>("/billing/invoices/my-invoices/"); return data; }

export async function getPayments(filters?: Record<string, string>) { const { data } = await api.get<Payment[]>("/billing/payments/", { params: filters }); return data; }
export async function createPayment(payload: Partial<Payment>) { const { data } = await api.post<Payment>("/billing/payments/", payload); return data; }
export async function voidPayment(id: number | string, reason: string) { const { data } = await api.patch<Payment>(`/billing/payments/${id}/void/`, { reason }); return data; }
export async function getMyPayments() { const { data } = await api.get<Payment[]>("/billing/payments/my-payments/"); return data; }

export async function getCashSessions() { const { data } = await api.get<CashSession[]>("/billing/cash-sessions/"); return data; }
export async function getCurrentCashSession() { const { data } = await api.get<CashSession>("/billing/cash-sessions/current/"); return data; }
export async function openCashSession(payload: { opening_amount: string; notes?: string }) { const { data } = await api.post<CashSession>("/billing/cash-sessions/open/", payload); return data; }
export async function closeCashSession(id: number | string, payload: { closing_amount: string; notes?: string }) { const { data } = await api.patch<CashSession>(`/billing/cash-sessions/${id}/close/`, payload); return data; }
export async function createCashMovement(id: number | string, payload: Partial<CashMovement>) { const { data } = await api.post<CashMovement>(`/billing/cash-sessions/${id}/movements/`, payload); return data; }

export async function getBillingStats(filters?: Record<string, string>) { const { data } = await api.get<BillingStats>("/billing/stats/", { params: filters }); return data; }
export async function getFiscalProfile() { const { data } = await api.get<ClinicFiscalProfile>("/billing/fiscal-profile/"); return data; }
export async function updateFiscalProfile(payload: Partial<ClinicFiscalProfile>) { const { data } = await api.patch<ClinicFiscalProfile>("/billing/fiscal-profile/", payload); return data; }
export async function getFiscalRanges(filters?: Record<string, string>) { const { data } = await api.get<FiscalDocumentRange[]>("/billing/fiscal-ranges/", { params: filters }); return data; }
export async function createFiscalRange(payload: Partial<FiscalDocumentRange>) { const { data } = await api.post<FiscalDocumentRange>("/billing/fiscal-ranges/", payload); return data; }
export async function updateFiscalRange(id: number | string, payload: Partial<FiscalDocumentRange>) { const { data } = await api.patch<FiscalDocumentRange>(`/billing/fiscal-ranges/${id}/`, payload); return data; }

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
