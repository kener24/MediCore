export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiListResponse<T> = T[] | PaginatedResponse<T> | { data?: T[]; items?: T[] };

export function normalizeListResponse<T>(response: ApiListResponse<T> | null | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (typeof response !== 'object') return [];
  if ('results' in response && Array.isArray(response.results)) return response.results;
  if ('data' in response && Array.isArray(response.data)) return response.data;
  if ('items' in response && Array.isArray(response.items)) return response.items;
  return [];
}

export type DoctorApiFallback<T> = {
  data: T;
  unavailable?: boolean;
};

const finalizedStatuses = ['completed', 'complete', 'completada', 'finalizada', 'atendida', 'closed', 'cerrada'];

export function isConsultationFinalized(status?: string | null) {
  return finalizedStatuses.includes((status ?? '').trim().toLowerCase());
}
