import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type { PatientPayment } from '@/features/patient/types/patientPayments.types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appConfig } from '@/core/config/appConfig';
import { getSession } from '@/core/storage/sessionStorage';

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
  const session = await getSession();
  if (!session.accessToken || !FileSystem.cacheDirectory) throw new Error('Tu sesion expiro. Inicia sesion nuevamente.');
  const filename = `recibo-${paymentNumber || id}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  const result = await FileSystem.downloadAsync(
    `${appConfig.API_BASE_URL}${endpoints.patientPortal.paymentReceiptPdf(id)}`,
    `${FileSystem.cacheDirectory}${filename}`,
    { headers: { Authorization: `Bearer ${session.accessToken}`, ...(session.sessionKey ? { 'X-Session-Key': session.sessionKey } : {}) } },
  );
  if (result.status !== 200) throw new Error('No se pudo descargar el recibo de pago.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite abrir o compartir el PDF.');
  await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Recibo de pago' });
}
