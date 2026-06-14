import { RoleGuard } from '@/components/RoleGuard';
import { RoleDashboardScreen } from '@/features/common/screens/RoleDashboardScreen';

export function PatientDashboardScreen() {
  return (
    <RoleGuard roles={['paciente']}>
      <RoleDashboardScreen
        description="Resumen personal del paciente"
        stats={[
          { icon: 'calendar-clock', label: 'Citas proximas', value: '0' },
          { icon: 'receipt-text-outline', label: 'Facturas pendientes', tone: 'warning', value: '0' },
          { icon: 'bell-outline', label: 'Notificaciones', tone: 'blue', value: '0' },
        ]}
        title="Mi resumen"
      />
    </RoleGuard>
  );
}
