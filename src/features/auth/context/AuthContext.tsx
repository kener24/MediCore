import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { clearApiCache } from '@/core/api/apiCache';
import { resetSessionExpiredNotification, setSessionExpiredHandler } from '@/core/api/authInterceptor';
import { registerDeviceForPushNotifications } from '@/core/notifications/pushNotificationService';
import {
  clearSession,
  getSession,
  resolveRole,
  saveSession,
} from '@/core/storage/sessionStorage';
import { resolveSupportedAppRole } from '@/core/utils/roleUtils';
import { getMeService, loginService, logoutService } from '@/features/auth/services/authService';
import type { AppRole, LoginPayload, RoleName, User } from '@/features/auth/types/auth.types';

interface AuthContextValue {
  appRole: AppRole | null;
  loading: boolean;
  role: RoleName | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setSessionExpiredHandler((message) => {
      setUser(null);
      Alert.alert('Sesión expirada', message || 'Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.');
    });

    let mounted = true;

    async function restore() {
      try {
        const session = await getSession();
        if (!session.accessToken) return;
        if (session.user && mounted) {
          setUser(session.user);
        }
        const currentUser = await getMeService();
        await saveSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? '',
          sessionKey: session.sessionKey ?? undefined,
          user: currentUser,
        });
        resetSessionExpiredNotification();
        if (mounted) setUser(currentUser);
      } catch {
        await clearSession();
        await clearApiCache();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void restore();

    return () => {
      mounted = false;
      setSessionExpiredHandler(null);
    };
  }, []);

  async function signIn(payload: LoginPayload) {
    const response = await loginService(payload);
    const currentUser = response.user ?? (await getMeService());
    await saveSession({
      accessToken: response.access,
      refreshToken: response.refresh,
      sessionKey: response.session_key,
      user: currentUser,
    });
    resetSessionExpiredNotification();
    setUser(currentUser);
    void registerDeviceForPushNotifications().catch(() => undefined);
  }

  async function signOut() {
    await logoutService();
    await clearSession();
    await clearApiCache();
    resetSessionExpiredNotification();
    setUser(null);
  }

  const role = resolveRole(user);
  const value = useMemo(
    () => ({
      appRole: resolveSupportedAppRole(role, user?.permissions ?? user?.user_permissions),
      loading,
      role,
      signIn,
      signOut,
      user,
    }),
    [loading, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
