import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'medicore.accessToken';
const REFRESH_TOKEN_KEY = 'medicore.refreshToken';
const SESSION_KEY = 'medicore.sessionKey';

export interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
  sessionKey: string | null;
}

export async function getStoredSession(): Promise<StoredSession> {
  const [accessToken, refreshToken, sessionKey] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(SESSION_KEY),
  ]);
  return { accessToken, refreshToken, sessionKey };
}

export async function saveSession(payload: {
  accessToken: string;
  refreshToken: string;
  sessionKey?: string;
}) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, payload.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refreshToken),
    payload.sessionKey
      ? SecureStore.setItemAsync(SESSION_KEY, payload.sessionKey)
      : SecureStore.deleteItemAsync(SESSION_KEY),
  ]);
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ]);
}
