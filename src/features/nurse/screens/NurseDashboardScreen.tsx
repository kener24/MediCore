import { RoleGuard } from '@/components/RoleGuard';
import { RoleDashboardScreen } from '@/features/common/screens/RoleDashboardScreen';

export function NurseDashboardScreen() {
  return (
    <RoleGuard roles={['enfermera']}>
      <RoleDashboardScreen
        description="Resumen de enfermeria"
        stats={[
          { icon: 'clipboard-account-outline', label: 'En espera', value: '0' },
          { icon: 'heart-pulse', label: 'Triajes', tone: 'blue', value: '0' },
          { icon: 'alert-outline', label: 'Prioritarios', tone: 'warning', value: '0' },
        ]}
        title="Panel enfermeria"
      />
    </RoleGuard>
  );
}
