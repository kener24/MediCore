import { RoleGuard } from '@/components/RoleGuard';
import { RoleDashboardScreen } from '@/features/common/screens/RoleDashboardScreen';

export function AdminDashboardScreen() {
  return (
    <RoleGuard roles={['admin']}>
      <RoleDashboardScreen
        description="Indicadores generales de la clínica"
        stats={[
          { icon: 'account-group-outline', label: 'Pacientes', value: '0' },
          { icon: 'calendar-today-outline', label: 'Citas hoy', tone: 'blue', value: '0' },
          { icon: 'receipt-text-outline', label: 'Facturas', tone: 'warning', value: '0' },
        ]}
        title="Panel admin"
      />
    </RoleGuard>
  );
}
