import {
  normalizeListResponse,
  type ApiListResponse,
  type PaginatedResponse,
} from '@/features/patient/types/commonPatient.types';

export type { ApiListResponse, PaginatedResponse };

export type ListResponse<T> = ApiListResponse<T>;

export function normalizeList<T>(payload: ListResponse<T>): T[] {
  return normalizeListResponse(payload);
}
