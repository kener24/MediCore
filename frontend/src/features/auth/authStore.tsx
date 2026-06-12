import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getMe, login as loginRequest } from "../../api/authApi";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_KEY } from "../../utils/constants";
import type { LoginPayload } from "../../types/auth";
import type { User } from "../../types/user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await getMe();
    setUser(me);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
      if (response.session_key) localStorage.setItem(SESSION_KEY, response.session_key);
      const authenticatedUser = response.user ?? (await getMe());
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    []
  );

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setIsBootstrapping(false);
        return;
      }
      try {
        await refreshMe();
      } catch {
        logout();
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
    window.addEventListener("medicore:logout", logout);
    return () => window.removeEventListener("medicore:logout", logout);
  }, [logout, refreshMe]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && localStorage.getItem(ACCESS_TOKEN_KEY)),
      isBootstrapping,
      login,
      logout,
      refreshMe,
    }),
    [isBootstrapping, login, logout, refreshMe, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
