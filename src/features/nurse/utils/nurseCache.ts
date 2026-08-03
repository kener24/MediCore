import * as SecureStore from 'expo-secure-store';

type CachedPayload<T> = {
  savedAt: string;
  value: T;
};

const prefix = 'medicore.nurse.cache.';
const registryKey = 'medicore.nurse.cache.registry';

export async function saveNurseCache<T>(key: string, value: T) {
  const payload: CachedPayload<T> = { savedAt: new Date().toISOString(), value };
  try {
    await SecureStore.setItemAsync(`${prefix}${key}`, JSON.stringify(payload));
    await rememberCacheKey(`${prefix}${key}`);
  } catch {
    // Cache is best-effort and must never block clinical workflows.
  }
}

export async function clearNurseCache() {
  const keys = await readRegistry();
  await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  await SecureStore.deleteItemAsync(registryKey);
}

async function readRegistry() {
  try {
    const raw = await SecureStore.getItemAsync(registryKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string' && key.startsWith(prefix)) : [];
  } catch {
    return [];
  }
}

async function rememberCacheKey(key: string) {
  const keys = await readRegistry();
  if (keys.includes(key)) return;
  await SecureStore.setItemAsync(registryKey, JSON.stringify([...keys, key]));
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
