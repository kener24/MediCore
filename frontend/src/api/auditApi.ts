import api from "./axios";
import type { AuditFilters, AuditLog, AuditStats, PaginatedAuditLogs } from "../types/audit";

export async function getAuditLogs(filters?: AuditFilters) { const { data } = await api.get<PaginatedAuditLogs>("/audit/logs/", { params: filters }); return data; }
export async function getAuditLog(id: number | string) { const { data } = await api.get<AuditLog>(`/audit/logs/${id}/`); return data; }
export async function getAuditStats(filters?: AuditFilters) { const { data } = await api.get<AuditStats>("/audit/stats/", { params: filters }); return data; }
export async function getMyActivity(filters?: AuditFilters) { const { data } = await api.get<PaginatedAuditLogs>("/audit/logs/my-activity/", { params: filters }); return data; }

