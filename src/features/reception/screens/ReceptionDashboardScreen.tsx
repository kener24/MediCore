import { RoleGuard } from '@/components/RoleGuard';
import { RoleDashboardScreen } from '@/features/common/screens/RoleDashboardScreen';

export function ReceptionDashboardScreen() {
  return (
    <RoleGuard roles={['recepcionista']}>
      <RoleDashboardScreen
        description="Resumen operativo de recepción"
        stats={[
          { icon: 'calendar-check-outline', label: 'Citas hoy', value: '0' },
          { icon: 'account-clock-outline', label: 'Admisiones', tone: 'blue', value: '0' },
          { icon: 'cash-clock', label: 'Cobros', tone: 'warning', value: '0' },
        ]}
        title="Panel recepción"
      />
    </RoleGuard>
  );
}
