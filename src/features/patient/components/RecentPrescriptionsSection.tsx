import { View } from 'react-native';

import { DashboardSection } from '@/features/patient/components/DashboardSection';
import { PrescriptionCard } from '@/features/patient/components/PrescriptionCard';
import type { PatientPrescription } from '@/features/patient/types/patientPrescriptions.types';

export function RecentPrescriptionsSection({
  items,
  onPressItem,
}: {
  items: PatientPrescription[];
  onPressItem: (id: number) => void;
}) {
  return (
    <DashboardSection
      emptyDescription="No tienes recetas recientes."
      emptyTitle="Sin recetas recientes"
      isEmpty={!items.length}
      title="Recetas recientes">
      <View style={{ gap: 12 }}>
        {items.slice(0, 3).map((item) => (
          <PrescriptionCard key={item.id} prescription={item} onPress={() => onPressItem(item.id)} />
        ))}
      </View>
    </DashboardSection>
  );
}
