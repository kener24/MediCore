export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ListResponse<T> = T[] | PaginatedResponse<T>;

export function normalizeList<T>(payload: ListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.results ?? [];
}
