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
    return await getFirstAvailable<CashierDashboard>(['/billing/dashboard/', '/cashier/dashboard/', '/payments/dashboard/']);
  } catch {
    return getTodayCashierStats();
  }
}

export async function getTodayCashierStats(): Promise<CashierDashboard> {
  const [pending, paid, payments] = await Promise.all([
    getInvoices({ status: 'pending' }).catch(() => []),
    getInvoices({ status: 'paid', today: true }).catch(() => []),
    getPaymentsHistory({ today: true }).catch(() => []),
  ]);
  return {
    paid_invoices_today: paid.length,
    payments_today: payments.length,
    pending_invoices: pending.length,
    total_collected_today: payments.reduce((sum, payment) => sum + numericValue(payment.amount), 0),
  };
}
