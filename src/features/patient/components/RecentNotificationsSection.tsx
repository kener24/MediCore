import { View } from 'react-native';

import { DashboardSection } from '@/features/patient/components/DashboardSection';
import { NotificationCard } from '@/features/patient/components/NotificationCard';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';

export function RecentNotificationsSection({ items }: { items: PatientNotification[] }) {
  return (
    <DashboardSection
      emptyDescription="No tienes notificaciones."
      emptyTitle="Sin notificaciones"
      isEmpty={!items.length}
      title="Notificaciónes recientes">
      <View style={{ gap: 12 }}>
        {items.slice(0, 3).map((item) => (
          <NotificationCard key={item.id} notification={item} />
        ))}
      </View>
    </DashboardSection>
  );
}
