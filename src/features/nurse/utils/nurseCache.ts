import * as SecureStore from 'expo-secure-store';

type CachedPayload<T> = {
  savedAt: string;
  value: T;
};

const prefix = 'medicore.nurse.cache.';

export async function saveNurseCache<T>(key: string, value: T) {
  const payload: CachedPayload<T> = { savedAt: new Date().toISOString(), value };
  try {
    await SecureStore.setItemAsync(`${prefix}${key}`, JSON.stringify(payload));
  } catch {
    // Cache is best-effort and must never block clinical workflows.
  }
}

export async function readNurseCache<T>(key: string): Promise<CachedPayload<T> | null> {
  try {
    const raw = await SecureStore.getItemAsync(`${prefix}${key}`);
    return raw ? (JSON.parse(raw) as CachedPayload<T>) : null;
  } catch {
    return null;
  }
}

export function cacheLabel(savedAt?: string) {
  if (!savedAt) return 'Mostrando últimos datos guardados en este dispositivo.';
  return `Mostrando últimos datos guardados: ${new Date(savedAt).toLocaleString()}.`;
}
