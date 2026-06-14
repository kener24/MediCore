import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function PatientHomeScreen() {
  return (
    <RoleGuard roles={['paciente']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Consulta próximas citas, solicitudes y cambios de horario.',
            icon: 'calendar-check-outline',
            title: 'Mis citas',
          },
          {
            description: 'Resumen clínico, documentos y antecedentes importantes.',
            icon: 'file-document-outline',
            title: 'Expediente',
          },
          {
            description: 'Facturas, saldos y comprobantes disponibles.',
            icon: 'receipt-text-outline',
            title: 'Facturación',
          },
        ]}
        headline="Tu salud en un solo lugar"
        roleLabel="Paciente"
        subtitle="Panel preparado para conectar citas, expediente, pagos y notificaciones."
      />
    </RoleGuard>
  );
}
