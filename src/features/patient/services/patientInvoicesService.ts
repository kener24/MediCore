import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { downloadAndShareAuthenticated } from '@/core/files/authenticatedFile';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientCreditNote, PatientInvoice } from '@/features/patient/types/patientInvoices.types';

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

export async function sharePatientInvoicePdf(id: number | string, invoiceNumber?: string) {
  return downloadAndShareAuthenticated({
    dialogTitle: 'Factura MediCore',
    filename: `factura-${invoiceNumber || id}.pdf`,
    mimeType: 'application/pdf',
    path: endpoints.patientPortal.invoicePdf(id),
  });
}

export const getInvoiceFiscalPdf = sharePatientInvoicePdf;
export const getInvoicePdf = sharePatientInvoicePdf;

export async function getPatientCreditNotes() {
  const { data } = await apiClient.get<ListResponse<PatientCreditNote>>(endpoints.patientPortal.creditNotes);
  return normalizeList(data);
}

export async function sharePatientCreditNotePdf(id: number | string, number?: string) {
  return downloadAndShareAuthenticated({
    dialogTitle: 'Nota de crédito MediCore',
    filename: `nota-credito-${number || id}.pdf`,
    mimeType: 'application/pdf',
    path: endpoints.patientPortal.creditNotePdf(id),
  });
}
