import api from "./axios";
import type { InventoryCategory, InventoryItem, InventoryLot, InventoryMovement, InventoryStats } from "../types/inventory";

type ListResponse<T> = T[] | { results: T[] };
const list = <T>(data: ListResponse<T>) => Array.isArray(data) ? data : data.results ?? [];

export async function getInventoryCategories(filters?: Record<string, string>) { const { data } = await api.get<ListResponse<InventoryCategory>>("/inventory/categories/", { params: filters }); return list(data); }
export async function createInventoryCategory(payload: Partial<InventoryCategory>) { const { data } = await api.post<InventoryCategory>("/inventory/categories/", payload); return data; }
export async function updateInventoryCategory(id: number | string, payload: Partial<InventoryCategory>) { const { data } = await api.patch<InventoryCategory>(`/inventory/categories/${id}/`, payload); return data; }
export async function deleteInventoryCategory(id: number | string) { await api.delete(`/inventory/categories/${id}/`); }

export async function getInventoryItems(filters?: Record<string, string>) { const { data } = await api.get<ListResponse<InventoryItem>>("/inventory/items/", { params: filters }); return list(data); }
export async function getInventoryItem(id: number | string) { const { data } = await api.get<InventoryItem>(`/inventory/items/${id}/`); return data; }
export async function createInventoryItem(payload: Partial<InventoryItem>) { const { data } = await api.post<InventoryItem>("/inventory/items/", payload); return data; }
export async function updateInventoryItem(id: number | string, payload: Partial<InventoryItem>) { const { data } = await api.patch<InventoryItem>(`/inventory/items/${id}/`, payload); return data; }
export async function activateInventoryItem(id: number | string) { const { data } = await api.patch<InventoryItem>(`/inventory/items/${id}/activate/`); return data; }
export async function deactivateInventoryItem(id: number | string) { const { data } = await api.patch<InventoryItem>(`/inventory/items/${id}/deactivate/`); return data; }

export async function getInventoryLots(filters?: Record<string, string>) { const { data } = await api.get<ListResponse<InventoryLot>>("/inventory/lots/", { params: filters }); return list(data); }
export async function getInventoryMovements(filters?: Record<string, string>) { const { data } = await api.get<ListResponse<InventoryMovement>>("/inventory/movements/", { params: filters }); return list(data); }
export async function stockIn(itemId: number | string, payload: Record<string, string>, idempotencyKey?: string) { const { data } = await api.post<InventoryMovement>(`/inventory/items/${itemId}/stock-in/`, payload, { headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined }); return data; }
export async function stockOut(itemId: number | string, payload: Record<string, string>, idempotencyKey?: string) { const { data } = await api.post<InventoryMovement>(`/inventory/items/${itemId}/stock-out/`, payload, { headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined }); return data; }
export async function adjustStock(itemId: number | string, payload: Record<string, string>, idempotencyKey?: string) { const { data } = await api.post<InventoryMovement>(`/inventory/items/${itemId}/adjust-stock/`, payload, { headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined }); return data; }

export async function getLowStockAlerts() { const { data } = await api.get<InventoryItem[]>("/inventory/alerts/low-stock/"); return data; }
export async function getExpiringSoonAlerts(days = 30) { const { data } = await api.get<InventoryLot[]>("/inventory/alerts/expiring-soon/", { params: { days } }); return data; }
export async function getExpiredAlerts() { const { data } = await api.get<InventoryLot[]>("/inventory/alerts/expired/"); return data; }
export async function getInventoryStats() { const { data } = await api.get<InventoryStats>("/inventory/stats/"); return data; }
