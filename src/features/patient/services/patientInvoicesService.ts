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
  const { data } = await apiClient.get(endpoints.patientPortal.invoice(id));
  return data;
}

export async function getInvoiceFiscalPdf(id: number | string) {
  const { data } = await apiClient.get<ArrayBuffer>(endpoints.patientPortal.invoiceFiscalPdf(id), {
    responseType: 'arraybuffer',
  });
  return data;
}

export const getInvoicePdf = getInvoiceFiscalPdf;
