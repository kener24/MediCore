import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function NurseHomeScreen() {
  return (
    <RoleGuard roles={['enfermera']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Pacientes listos para evaluacion inicial.',
            icon: 'clipboard-account-outline',
            title: 'Triaje',
          },
          {
            description: 'Signos vitales y notas de enfermeria.',
            icon: 'heart-pulse',
            title: 'Signos vitales',
          },
          {
            description: 'Seguimiento operativo de atenciones.',
            icon: 'format-list-checks',
            title: 'Pendientes',
          },
        ]}
        headline="Cuidado clinico organizado"
        roleLabel="Enfermeria"
        subtitle="Base lista para triaje, signos vitales y seguimiento de pacientes."
      />
    </RoleGuard>
  );
}
