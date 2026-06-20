import { AppHeader } from '@/components/AppHeader';

export function CashierHeader({ subtitle, title }: { subtitle?: string; title: string }) {
  return <AppHeader icon="cash-register" subtitle={subtitle ?? 'Caja movil MediCore.'} title={title} />;
}
