import { getFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import { getInvoices } from '@/features/cashier/services/cashierInvoiceService';
import { getPaymentsHistory } from '@/features/cashier/services/cashierPaymentService';
import { numericValue } from '@/features/cashier/types/commonCashier.types';

export type CashierDashboard = {
  pending_invoices?: number;
  paid_invoices_today?: number;
  payments_today?: number;
  total_collected_today?: number | string;
};

export async function getCashierDashboard(): Promise<CashierDashboard> {
  try {
    const stats = await getFirstAvailable<Record<string, number | string>>(['/billing/stats/', '/billing/dashboard/', '/cashier/dashboard/', '/payments/dashboard/']);
    return {
      paid_invoices_today: Number(stats.paid_invoices ?? stats.paid_invoices_today ?? 0),
      payments_today: Number(stats.payments_today ?? 0),
      pending_invoices: Number(stats.pending_invoices ?? 0),
      total_collected_today: stats.today_payments ?? stats.total_collected_today ?? 0,
    };
  } catch {
    return getTodayCashierStats();
  }
}

export async function getTodayCashierStats(): Promise<CashierDashboard> {
  const [pending, paid, payments] = await Promise.all([
    getInvoices({ status: 'pendiente' }).catch(() => []),
    getInvoices({ status: 'pagada', today: true }).catch(() => []),
    getPaymentsHistory({ today: true }).catch(() => []),
  ]);
  return {
    paid_invoices_today: paid.length,
    payments_today: payments.length,
    pending_invoices: pending.length,
    total_collected_today: payments.reduce((sum, payment) => sum + numericValue(payment.amount), 0),
  };
}
