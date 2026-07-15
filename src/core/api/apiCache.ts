import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'medicore.apiCache.';
const CACHE_TTL_MS = 1000 * 60 * 15;
const MAX_CACHE_ENTRIES = 80;

type CacheRecord<T = unknown> = {
  data: T;
  savedAt: number;
};

export type CachedApiResponse<T = unknown> = {
  data: T;
  savedAt: number;
  stale: boolean;
};

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

export function buildApiCacheKey(options: {
  baseURL?: string;
  method?: string;
  params?: unknown;
  url?: string;
  userKey?: string;
}) {
  const rawKey = [
    options.userKey || 'anonymous',
    options.method || 'get',
    options.baseURL || '',
    options.url || '',
    safeStringify(options.params),
  ].join('|');
  return `${CACHE_PREFIX}${encodeURIComponent(rawKey)}`;
}

export async function cacheApiResponse<T>(key: string, data: T) {
  const record: CacheRecord<T> = { data, savedAt: Date.now() };
  await AsyncStorage.setItem(key, JSON.stringify(record));
  void pruneCache();
}

export async function getCachedApiResponse<T>(key: string): Promise<CachedApiResponse<T> | null> {
  const payload = await AsyncStorage.getItem(key);
  if (!payload) return null;
  try {
    const record = JSON.parse(payload) as CacheRecord<T>;
    if (!record || typeof record.savedAt !== 'number') return null;
    return {
      data: record.data,
      savedAt: record.savedAt,
      stale: Date.now() - record.savedAt > CACHE_TTL_MS,
    };
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function clearApiCache() {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
  if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
}

async function pruneCache() {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(CACHE_PREFIX));
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  const records = await AsyncStorage.multiGet(keys);
  const sortable = records
    .map(([key, value]) => {
      try {
        const parsed = value ? (JSON.parse(value) as CacheRecord) : null;
        return { key, savedAt: parsed?.savedAt ?? 0 };
      } catch {
        return { key, savedAt: 0 };
      }
    })
    .sort((a, b) => a.savedAt - b.savedAt);
  const remove = sortable.slice(0, sortable.length - MAX_CACHE_ENTRIES).map((item) => item.key);
  if (remove.length) await AsyncStorage.multiRemove(remove);
}
