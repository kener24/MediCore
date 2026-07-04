import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { setSessionExpiredHandler } from '@/core/api/authInterceptor';
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
  loading: boolean;
  user: User | null;
  role: RoleName | null;
  appRole: AppRole | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      Alert.alert('Sesión expirada', 'Tu sesión expiró. Inicia sesión nuevamente.');
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
        if (mounted) setUser(currentUser);
      } catch {
        await clearSession();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restore();

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
    setUser(currentUser);
  }

  async function signOut() {
    await logoutService();
    await clearSession();
    setUser(null);
  }

  const role = resolveRole(user);
  const value = useMemo(
    () => ({
      loading,
      user,
      role,
      appRole: resolveSupportedAppRole(role, user?.permissions ?? user?.user_permissions),
      signIn,
      signOut,
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
