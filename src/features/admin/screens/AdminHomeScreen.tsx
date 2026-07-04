import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function AdminHomeScreen() {
  return (
    <RoleGuard roles={['admin']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Usuarios, roles y permisos de la clínica.',
            icon: 'account-cog-outline',
            title: 'Administración',
          },
          {
            description: 'Facturacion, caja e indicadores financieros.',
            icon: 'chart-box-outline',
            title: 'Gestion',
          },
          {
            description: 'Inventario, servicios y configuraciones operativas.',
            icon: 'cog-outline',
            title: 'Configuración',
          },
        ]}
        headline="Control móvil de la clínica"
        roleLabel="Administrador"
        subtitle="Panel preparado para administración, permisos, reportes y operación."
      />
    </RoleGuard>
  );
}
