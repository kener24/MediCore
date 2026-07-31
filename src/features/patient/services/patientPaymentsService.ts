import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { downloadAndShareAuthenticated } from '@/core/files/authenticatedFile';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';

export async function getPatientPayments(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientPayment>>(
    endpoints.patientPortal.payments,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientPayment(id: number | string) {
  const { data } = await apiClient.get<PatientPayment>(endpoints.patientPortal.payment(id));
  return data;
}

export async function sharePatientPaymentReceipt(id: number | string, paymentNumber?: string) {
  return downloadAndShareAuthenticated({
    dialogTitle: 'Recibo de pago',
    filename: `recibo-${paymentNumber || id}.pdf`,
    mimeType: 'application/pdf',
    path: endpoints.patientPortal.paymentReceiptPdf(id),
  });
}
