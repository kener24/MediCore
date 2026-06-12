import api from "./axios";
import type { PurchaseOrder, PurchaseReceipt, PurchaseStats, Supplier } from "../types/purchase";

export async function getSuppliers(filters?: Record<string, string>) { const { data } = await api.get<Supplier[]>("/purchases/suppliers/", { params: filters }); return data; }
export async function getSupplier(id: number | string) { const { data } = await api.get<Supplier>(`/purchases/suppliers/${id}/`); return data; }
export async function createSupplier(payload: Partial<Supplier>) { const { data } = await api.post<Supplier>("/purchases/suppliers/", payload); return data; }
export async function updateSupplier(id: number | string, payload: Partial<Supplier>) { const { data } = await api.patch<Supplier>(`/purchases/suppliers/${id}/`, payload); return data; }
export async function deleteSupplier(id: number | string) { await api.delete(`/purchases/suppliers/${id}/`); }
export async function getSupplierHistory(id: number | string) { const { data } = await api.get(`/purchases/suppliers/${id}/history/`); return data; }

export async function getPurchaseOrders(filters?: Record<string, string>) { const { data } = await api.get<PurchaseOrder[]>("/purchases/orders/", { params: filters }); return data; }
export async function getPurchaseOrder(id: number | string) { const { data } = await api.get<PurchaseOrder>(`/purchases/orders/${id}/`); return data; }
export async function createPurchaseOrder(payload: Record<string, unknown>) { const { data } = await api.post<PurchaseOrder>("/purchases/orders/", payload); return data; }
export async function updatePurchaseOrder(id: number | string, payload: Partial<PurchaseOrder>) { const { data } = await api.patch<PurchaseOrder>(`/purchases/orders/${id}/`, payload); return data; }
export async function approvePurchaseOrder(id: number | string) { const { data } = await api.patch<PurchaseOrder>(`/purchases/orders/${id}/approve/`); return data; }
export async function cancelPurchaseOrder(id: number | string, reason: string) { const { data } = await api.patch<PurchaseOrder>(`/purchases/orders/${id}/cancel/`, { reason }); return data; }
export async function recalculatePurchaseOrder(id: number | string) { const { data } = await api.patch<PurchaseOrder>(`/purchases/orders/${id}/recalculate/`); return data; }
export async function createPurchaseOrderItem(orderId: number | string, payload: Record<string, unknown>) { const { data } = await api.post(`/purchases/orders/${orderId}/items/`, payload); return data; }
export async function updatePurchaseOrderItem(orderId: number | string, itemId: number | string, payload: Record<string, unknown>) { const { data } = await api.patch(`/purchases/orders/${orderId}/items/${itemId}/`, payload); return data; }
export async function deletePurchaseOrderItem(orderId: number | string, itemId: number | string) { await api.delete(`/purchases/orders/${orderId}/items/${itemId}/`); }

export async function getPurchaseReceipts(filters?: Record<string, string>) { const { data } = await api.get<PurchaseReceipt[]>("/purchases/receipts/", { params: filters }); return data; }
export async function getPurchaseReceipt(id: number | string) { const { data } = await api.get<PurchaseReceipt>(`/purchases/receipts/${id}/`); return data; }
export async function receivePurchaseOrder(orderId: number | string, payload: Record<string, unknown>) { const { data } = await api.post<PurchaseReceipt>(`/purchases/orders/${orderId}/receive/`, payload); return data; }
export async function getItemPurchaseHistory(itemId: number | string) { const { data } = await api.get(`/purchases/items/${itemId}/history/`); return data; }
export async function getPurchaseStats(filters?: Record<string, string>) { const { data } = await api.get<PurchaseStats>("/purchases/stats/", { params: filters }); return data; }

