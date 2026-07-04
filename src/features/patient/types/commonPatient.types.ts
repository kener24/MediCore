export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiListResponse<T> =
  | T[]
  | PaginatedResponse<T>
  | { data?: T[] | ApiListResponse<T>; items?: T[]; payload?: ApiListResponse<T>; results?: T[] };

export function normalizeListResponse<T>(response: ApiListResponse<T> | null | undefined | unknown): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (typeof response !== 'object') return [];

  const record = response as {
    data?: T[] | ApiListResponse<T>;
    items?: T[];
    payload?: ApiListResponse<T>;
    results?: T[];
  };
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  const nestedData = record.data;
  if (nestedData && typeof nestedData === 'object') return normalizeListResponse<T>(nestedData);
  const nestedPayload = record.payload;
  if (nestedPayload && typeof nestedPayload === 'object') return normalizeListResponse<T>(nestedPayload);
  return [];
}
