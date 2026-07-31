import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { clearApiCache } from '@/core/api/apiCache';
import { resetSessionExpiredNotification, setSessionExpiredHandler } from '@/core/api/authInterceptor';
import { clearPrivateTemporaryFiles } from '@/core/files/authenticatedFile';
import { disablePushDevice, getNotificationPreferences, registerDeviceForPushNotifications } from '@/core/notifications/pushNotificationService';
import { clearSession, getSession, resolveRole, saveSession } from '@/core/storage/sessionStorage';
import { resolveSupportedAppRole } from '@/core/utils/roleUtils';
import { getMeService, loginService, logoutService } from '@/features/auth/services/authService';
import type { AppRole, LoginPayload, RoleName, User } from '@/features/auth/types/auth.types';
import { clearAllDoctorConsultationDrafts } from '@/features/doctor/services/doctorLocalDraftService';

interface AuthContextValue {
  appRole: AppRole | null;
  dismissSessionExpired: () => void;
  loading: boolean;
  role: RoleName | null;
  sessionExpiredMessage: string | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function clearPrivateState() {
  await Promise.all([
    clearSession(),
    clearApiCache(),
    clearPrivateTemporaryFiles(),
    clearAllDoctorConsultationDrafts(),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    setSessionExpiredHandler((message) => {
      void clearPrivateTemporaryFiles();
      void clearAllDoctorConsultationDrafts();
      setSessionExpiredMessage(message || 'Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.');
      setUser(null);
    });

    let mounted = true;
    async function restore() {
      try {
        const session = await getSession();
        if (!session.accessToken) return;
        if (session.user && mounted) setUser(session.user);
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
        await clearPrivateState();
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundAt.current = Date.now();
        return;
      }
      if (state !== 'active' || !backgroundAt.current || !user) return;
      const elapsed = Date.now() - backgroundAt.current;
      backgroundAt.current = null;
      if (elapsed < 30 * 60_000) return;
      void clearPrivateState().finally(() => {
        setSessionExpiredMessage('La sesión se cerró después de 30 minutos de inactividad.');
        setUser(null);
      });
    });
    return () => subscription.remove();
  }, [user]);

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
    setSessionExpiredMessage(null);
    setUser(currentUser);
    void getNotificationPreferences()
      .then((preferences) => preferences.push_enabled ? registerDeviceForPushNotifications() : undefined)
      .catch(() => undefined);
  }

  async function signOut() {
    try {
      await disablePushDevice().catch(() => undefined);
      await logoutService();
    } catch {
      // La limpieza local debe completarse aunque no exista conexión.
    } finally {
      await clearPrivateState();
      resetSessionExpiredNotification();
      setSessionExpiredMessage(null);
      setUser(null);
    }
  }

  const role = resolveRole(user);
  const value = useMemo(
    () => ({
      appRole: resolveSupportedAppRole(role, user?.permissions ?? user?.user_permissions),
      dismissSessionExpired: () => setSessionExpiredMessage(null),
      loading,
      role,
      sessionExpiredMessage,
      signIn,
      signOut,
      user,
    }),
    [loading, role, sessionExpiredMessage, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
