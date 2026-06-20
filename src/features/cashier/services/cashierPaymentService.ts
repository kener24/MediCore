import { getFirstAvailable, postFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import { normalizeListResponse, type ApiListResponse, type QueryParams } from '@/features/cashier/types/commonCashier.types';
import type { CashierPayment, RegisterPaymentPayload } from '@/features/cashier/types/cashierPayment.types';

export async function registerPayment(invoiceId: number | string, payload: RegisterPaymentPayload): Promise<CashierPayment> {
  return postFirstAvailable<CashierPayment>(
    [`/billing/invoices/${invoiceId}/payments/`, '/billing/payments/'],
    { ...payload, invoice: invoiceId, invoice_id: Number(invoiceId) },
  );
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
