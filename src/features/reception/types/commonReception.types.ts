export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiListResponse<T> = T[] | PaginatedResponse<T> | { data?: T[]; items?: T[] };

export function normalizeListResponse<T>(response: ApiListResponse<T> | unknown): T[] {
  if (Array.isArray(response)) return response;
  const payload = response as { results?: T[]; data?: T[]; items?: T[] };
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export type QueryParams = Record<string, string | number | boolean | undefined>;
