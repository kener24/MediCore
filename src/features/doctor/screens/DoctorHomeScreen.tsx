import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function DoctorHomeScreen() {
  return (
    <RoleGuard roles={['medico', 'doctor']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Agenda diaria y pacientes confirmados.',
            icon: 'calendar-account-outline',
            title: 'Consultas',
          },
          {
            description: 'Acceso rápido a expedientes clínicos autorizados.',
            icon: 'clipboard-pulse-outline',
            title: 'Expedientes',
          },
          {
            description: 'Pendientes clínicos, notas y resultados.',
            icon: 'stethoscope',
            title: 'Atenciones',
          },
        ]}
        headline="Operación médica lista"
        roleLabel="Médico"
        subtitle="Panel profesional con base para agenda, expediente y atenciones."
      />
    </RoleGuard>
  );
}
