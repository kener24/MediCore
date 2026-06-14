export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiListResponse<T> = T[] | PaginatedResponse<T>;

export function normalizeListResponse<T>(response: ApiListResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  return response.results ?? [];
}
