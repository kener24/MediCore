import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SessionExpiredScreen } from '@/features/auth/screens/SessionExpiredScreen';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { RoleNavigator } from '@/navigation/RoleNavigator';

export function RootNavigator() {
  const { dismissSessionExpired, loading, sessionExpiredMessage, user } = useAuth();

  if (loading) {
    return <LoadingState label="Preparando MediCore..." />;
  }

  if (sessionExpiredMessage) {
    return <SessionExpiredScreen message={sessionExpiredMessage} onContinue={dismissSessionExpired} />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return <RoleNavigator />;
}
