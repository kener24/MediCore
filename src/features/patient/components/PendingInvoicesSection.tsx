import { View } from 'react-native';

import { DashboardSection } from '@/features/patient/components/DashboardSection';
import { InvoiceCard } from '@/features/patient/components/InvoiceCard';
import type { PatientInvoice } from '@/features/patient/types/patientInvoices.types';

export function PendingInvoicesSection({
  currency,
  items,
  onPressItem,
}: {
  currency: string;
  items: PatientInvoice[];
  onPressItem: (id: number) => void;
}) {
  return (
    <DashboardSection
      emptyDescription="No tienes facturas pendientes."
      emptyTitle="Sin facturas pendientes"
      isEmpty={!items.length}
      title="Facturas pendientes">
      <View style={{ gap: 12 }}>
        {items.slice(0, 3).map((item) => (
          <InvoiceCard currency={currency} invoice={item} key={item.id} onPress={() => onPressItem(item.id)} />
        ))}
      </View>
    </DashboardSection>
  );
}
