import { ReactNode } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { isNurseRole, isReceptionRole } from '@/core/utils/roleUtils';
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
    const isPatientPortal = roles.length === 1 && roles[0] === 'paciente';
    const isDoctorModule = roles.includes('medico') || roles.includes('doctor');
    const isNurseModule = roles.some((role) => isNurseRole(role));
    const isReceptionModule = roles.some((role) => isReceptionRole(role));
    return (
      <ErrorState
        message={
          isPatientPortal
            ? 'Tu rol no tiene acceso al portal paciente.'
            : isDoctorModule
              ? 'No tienes acceso al módulo médico.'
              : isNurseModule
                ? 'No tienes acceso al módulo de enfermería.'
                : isReceptionModule
                  ? 'No tienes acceso al módulo de recepción.'
                  : 'Tu usuario no tiene permisos para abrir esta sección.'
        }
        title="Acceso no autorizado"
      />
    );
  }

  return children;
}
