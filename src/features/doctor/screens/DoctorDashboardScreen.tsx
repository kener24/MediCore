import { RoleGuard } from '@/components/RoleGuard';
import { RoleDashboardScreen } from '@/features/common/screens/RoleDashboardScreen';

export function DoctorDashboardScreen() {
  return (
    <RoleGuard roles={['medico']}>
      <RoleDashboardScreen
        description="Indicadores clinicos del medico"
        stats={[
          { icon: 'account-heart-outline', label: 'Pacientes hoy', value: '0' },
          { icon: 'clipboard-text-clock-outline', label: 'Pendientes', tone: 'warning', value: '0' },
          { icon: 'check-decagram-outline', label: 'Finalizadas', tone: 'blue', value: '0' },
        ]}
        title="Panel medico"
      />
    </RoleGuard>
  );
}
