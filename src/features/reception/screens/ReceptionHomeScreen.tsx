import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function ReceptionHomeScreen() {
  return (
    <RoleGuard roles={['recepcionista']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Registro, busqueda y confirmacion de pacientes.',
            icon: 'account-multiple-plus-outline',
            title: 'Pacientes',
          },
          {
            description: 'Agenda, confirmaciones y reprogramaciones.',
            icon: 'calendar-month-outline',
            title: 'Citas',
          },
          {
            description: 'Facturas y cobros pendientes de caja.',
            icon: 'cash-register',
            title: 'Caja',
          },
        ]}
        headline="Recepcion sin friccion"
        roleLabel="Recepcion"
        subtitle="Base movil para admisiones, citas y cobros de la clinica."
      />
    </RoleGuard>
  );
}
