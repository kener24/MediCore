import { apiClient } from '@/core/api/apiClient';
import { getFirstAvailable } from '@/features/cashier/services/cashierApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/cashier/types/commonCashier.types';
import type { CashMovement, CashSession, CashSummary, CloseCashSessionPayload, CreateCashMovementPayload, OpenCashSessionPayload } from '@/features/cashier/types/cashierCash.types';

export async function getCurrentCashSession(): Promise<CashSession | null> {
  try {
    return await getFirstAvailable<CashSession>(['/billing/cash-sessions/current/']);
  } catch {
    return null;
  }
}

export async function getCashSessions(): Promise<CashSession[]> {
  const data = await getFirstAvailable<ApiListResponse<CashSession>>(['/billing/cash-sessions/']);
  return normalizeListResponse(data);
}

export async function getCashSummary(date?: string): Promise<CashSummary> {
  const { data } = await apiClient.get<CashSummary>('/billing/cash-sessions/summary/', { params: date ? { date } : undefined });
  return data;
}

export async function openCashSession(payload: OpenCashSessionPayload): Promise<CashSession> {
  const { data } = await apiClient.post<CashSession>('/billing/cash-sessions/open/', payload);
  return data;
}

export async function closeCashSession(sessionId: number | string, payload: CloseCashSessionPayload): Promise<CashSession> {
  const { data } = await apiClient.patch<CashSession>(`/billing/cash-sessions/${sessionId}/close/`, payload);
  return data;
}

export async function createCashMovement(sessionId: number | string, payload: CreateCashMovementPayload): Promise<CashMovement> {
  const { data } = await apiClient.post<CashMovement>(`/billing/cash-sessions/${sessionId}/movements/`, payload);
  return data;
}
