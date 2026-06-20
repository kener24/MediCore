import { ReactNode } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { isCashierRole, isNurseRole, isReceptionRole } from '@/core/utils/roleUtils';
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
    const isCashierModule = roles.some((role) => isCashierRole(role));

    return (
      <ErrorState
        message={
          isPatientPortal
            ? 'Tu rol no tiene acceso al portal paciente.'
            : isDoctorModule
              ? 'No tienes acceso al m?dulo m?dico.'
              : isNurseModule
                ? 'No tienes acceso al m?dulo de enfermer?a.'
                : isReceptionModule
                  ? 'No tienes acceso al m?dulo de recepci?n.'
                  : isCashierModule
                    ? 'No tienes acceso al m?dulo de caja.'
                    : 'Tu usuario no tiene permisos para abrir esta secci?n.'
        }
        title="Acceso no autorizado"
      />
    );
  }

  return children;
}
