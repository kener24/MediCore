import { RoleGuard } from '@/components/RoleGuard';
import { RoleHomeScreen } from '@/features/common/screens/RoleHomeScreen';

export function AdminHomeScreen() {
  return (
    <RoleGuard roles={['admin']}>
      <RoleHomeScreen
        actions={[
          {
            description: 'Usuarios, roles y permisos de la clinica.',
            icon: 'account-cog-outline',
            title: 'Administracion',
          },
          {
            description: 'Facturacion, caja e indicadores financieros.',
            icon: 'chart-box-outline',
            title: 'Gestion',
          },
          {
            description: 'Inventario, servicios y configuraciones operativas.',
            icon: 'cog-outline',
            title: 'Configuracion',
          },
        ]}
        headline="Control movil de la clinica"
        roleLabel="Administrador"
        subtitle="Panel preparado para administracion, permisos, reportes y operacion."
      />
    </RoleGuard>
  );
}
