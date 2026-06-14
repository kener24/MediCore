import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getMe, login } from '@/api/auth';
import { clearSession, getStoredSession, saveSession } from '@/lib/secureSession';
import type { LoginPayload, RoleName, User } from '@/types/auth';

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  role: RoleName | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveRole(user: User | null): RoleName | null {
  if (!user) return null;
  if (user.role_nombre) return user.role_nombre;
  if (typeof user.role === 'object') return user.role.nombre;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const { accessToken } = await getStoredSession();
        if (!accessToken) return;
        const currentUser = await getMe();
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
    };
  }, []);

  async function signIn(payload: LoginPayload) {
    const response = await login(payload);
    await saveSession({
      accessToken: response.access,
      refreshToken: response.refresh,
      sessionKey: response.session_key,
    });
    setUser(response.user ?? (await getMe()));
  }

  async function signOut() {
    await clearSession();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      loading,
      user,
      role: resolveRole(user),
      signIn,
      signOut,
    }),
    [loading, user],
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
