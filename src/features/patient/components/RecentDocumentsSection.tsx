import { View } from 'react-native';

import { DashboardSection } from '@/features/patient/components/DashboardSection';
import { DocumentCard } from '@/features/patient/components/DocumentCard';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';

export function RecentDocumentsSection({
  items,
  onPressItem,
}: {
  items: PatientDocument[];
  onPressItem: (id: number) => void;
}) {
  return (
    <DashboardSection
      emptyDescription="No tienes documentos recientes."
      emptyTitle="Sin documentos recientes"
      isEmpty={!items.length}
      title="Documentos recientes">
      <View style={{ gap: 12 }}>
        {items.slice(0, 3).map((item) => (
          <DocumentCard document={item} key={item.id} onPress={() => onPressItem(item.id)} />
        ))}
      </View>
    </DashboardSection>
  );
}
