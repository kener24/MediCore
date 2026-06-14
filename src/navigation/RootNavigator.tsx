import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { RoleNavigator } from '@/navigation/RoleNavigator';

export function RootNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingState label="Preparando MediCore..." />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return <RoleNavigator />;
}
