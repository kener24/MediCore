import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';

export async function getPatientInvoices(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientInvoice>>(
    endpoints.patientPortal.invoices,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientInvoice(id: number | string) {
  const { data } = await apiClient.get<PatientInvoice>(endpoints.patientPortal.invoice(id));
  return data;
}

export const getInvoiceDetail = getPatientInvoice;

export async function getInvoicePrintData(id: number | string) {
  const { data } = await apiClient.get(`/billing/invoices/${id}/print-data/`);
  return data;
}

export async function getInvoicePdf(id: number | string) {
  const { data } = await apiClient.get(`/billing/invoices/${id}/pdf/`);
  return data;
}
