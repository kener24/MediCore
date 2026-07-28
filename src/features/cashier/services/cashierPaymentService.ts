import { getFirstAvailable, postFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/cashier/types/commonCashier.types';
import type { CashierPayment, RegisterPaymentPayload } from '@/features/cashier/types/cashierPayment.types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appConfig } from '@/core/config/appConfig';
import { getSession } from '@/core/storage/sessionStorage';

export async function registerPayment(invoiceId: number | string, payload: RegisterPaymentPayload, idempotencyKey: string): Promise<CashierPayment> {
  return postFirstAvailable<CashierPayment>(
    [`/billing/invoices/${invoiceId}/payments/`, '/billing/payments/'],
    { ...payload, invoice: invoiceId, invoice_id: Number(invoiceId) },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

export async function sharePaymentReceipt(paymentId: number | string, paymentNumber?: string) {
  const session = await getSession();
  if (!session.accessToken || !FileSystem.cacheDirectory) throw new Error('Tu sesion expiro. Inicia sesion nuevamente.');
  const filename = `recibo-${paymentNumber || paymentId}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  const result = await FileSystem.downloadAsync(
    `${appConfig.API_BASE_URL}/billing/payments/${paymentId}/receipt-pdf/`,
    `${FileSystem.cacheDirectory}${filename}`,
    { headers: { Authorization: `Bearer ${session.accessToken}`, ...(session.sessionKey ? { 'X-Session-Key': session.sessionKey } : {}) } },
  );
  if (result.status !== 200) throw new Error('No se pudo descargar el recibo de pago.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite abrir o compartir el PDF.');
  await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Recibo de pago' });
}

export async function getPaymentDetail(paymentId: number | string): Promise<CashierPayment> {
  return getFirstAvailable<CashierPayment>([`/billing/payments/${paymentId}/`, `/payments/${paymentId}/`]);
}

export async function getPaymentsHistory(params?: QueryParams): Promise<CashierPayment[]> {
  const data = await getFirstAvailable<ApiListResponse<CashierPayment>>(['/billing/payments/', '/payments/'], params);
  return normalizeListResponse(data);
}

export async function getInvoicePayments(invoiceId: number | string): Promise<CashierPayment[]> {
  const data = await getFirstAvailable<ApiListResponse<CashierPayment>>([`/billing/invoices/${invoiceId}/payments/`, '/billing/payments/'], { invoice: invoiceId, invoice_id: invoiceId });
  return normalizeListResponse(data);
}
