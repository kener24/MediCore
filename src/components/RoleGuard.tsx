import { ReactNode } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { isCashierRole, isNurseRole, isPatientRole, isReceptionRole } from '@/core/utils/roleUtils';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { AppRole } from '@/features/auth/types/auth.types';

interface RoleGuardProps {
  children: ReactNode;
  roles: AppRole[];
}

export function RoleGuard({ children, roles }: RoleGuardProps) {
  const { appRole, loading, user } = useAuth();

  if (loading) {
    return <LoadingState label="Validando acceso..." />;
  }

  if (!user || !appRole || !roles.includes(appRole)) {
    return (
      <ErrorState
        message={resolveDeniedMessage(roles)}
        status={403}
        title="Acceso no autorizado"
        tone="permission"
      />
    );
  }

  return children;
}

function resolveDeniedMessage(roles: AppRole[]) {
  const isPatientPortal = roles.length === 1 && roles[0] === 'paciente';
  const isDoctorModule = roles.includes('medico') || roles.includes('doctor');
  const isNurseModule = roles.some((role) => isNurseRole(role));
  const isReceptionModule = roles.some((role) => isReceptionRole(role));
  const isCashierModule = roles.some((role) => isCashierRole(role));
  const isPatientRoleOnly = roles.some((role) => isPatientRole(role));
  const isSuperAdminModule = roles.includes('superadmin');

  if (isPatientPortal || isPatientRoleOnly) return 'Tu rol no tiene acceso al portal de paciente.';
  if (isDoctorModule) return 'No tienes acceso al módulo médico.';
  if (isNurseModule) return 'No tienes acceso al módulo de enfermería.';
  if (isReceptionModule) return 'No tienes acceso al módulo de recepción.';
  if (isCashierModule) return 'No tienes acceso al módulo de caja.';
  if (isSuperAdminModule) return 'No tienes acceso al control global del sistema.';
  return 'Tu usuario no tiene permisos para abrir esta sección.';
}
