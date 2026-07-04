import * as SecureStore from 'expo-secure-store';

import type { RoleName, SessionData, User } from '@/features/auth/types/auth.types';

const ACCESS_TOKEN_KEY = 'medicore.accessToken';
const REFRESH_TOKEN_KEY = 'medicore.refreshToken';
const SESSION_KEY = 'medicore.sessionKey';
const USER_KEY = 'medicore.user';

function resolveRole(user: User | null): RoleName | null {
  if (!user) return null;
  if (user.role_nombre) return user.role_nombre;
  if (typeof user.role === 'object') return user.role.nombre;
  return null;
}

async function parseStoredUser(userPayload: string | null): Promise<User | null> {
  if (!userPayload) return null;
  try {
    return JSON.parse(userPayload) as User;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

export async function saveSession(payload: {
  accessToken: string;
  refreshToken: string;
  sessionKey?: string;
  user?: User | null;
}) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, payload.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refreshToken),
    payload.sessionKey
      ? SecureStore.setItemAsync(SESSION_KEY, payload.sessionKey)
      : SecureStore.deleteItemAsync(SESSION_KEY),
    payload.user
      ? SecureStore.setItemAsync(USER_KEY, JSON.stringify(payload.user))
      : SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function getSession(): Promise<SessionData> {
  const [accessToken, refreshToken, sessionKey, userPayload] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(SESSION_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  const user = await parseStoredUser(userPayload);

  return {
    accessToken,
    refreshToken,
    sessionKey,
    user,
  };
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getUser() {
  const userPayload = await SecureStore.getItemAsync(USER_KEY);
  return parseStoredUser(userPayload);
}

export async function getUserRole() {
  const { user } = await getSession();
  return resolveRole(user);
}

export async function isLoggedIn() {
  const token = await getAccessToken();
  return Boolean(token);
}

export { resolveRole };
