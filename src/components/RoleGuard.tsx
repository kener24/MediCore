import { ReactNode } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
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
    return (
      <ErrorState
        message={
          isPatientPortal
            ? 'Tu rol no tiene acceso al portal paciente.'
            : 'Tu usuario no tiene permisos para abrir esta seccion.'
        }
        title="Acceso no autorizado"
      />
    );
  }

  return children;
}
