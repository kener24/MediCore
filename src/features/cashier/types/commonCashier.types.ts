export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiListResponse<T> = T[] | PaginatedResponse<T> | { data?: T[]; items?: T[]; results?: T[] };

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function normalizeListResponse<T>(response: ApiListResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  const record = response as { data?: T[]; items?: T[]; results?: T[] } | null;
  if (record && Array.isArray(record.results)) return record.results;
  if (record && Array.isArray(record.data)) return record.data;
  if (record && Array.isArray(record.items)) return record.items;
  return [];
}

export function formatCurrency(value?: number | string | null, currency = 'L') {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `${currency} ${safe.toFixed(2)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-HN', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit', year: 'numeric' });
}

export function numericValue(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}
