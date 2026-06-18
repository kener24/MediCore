import api from "./axios";
import type { AuditFilters, AuditLog, AuditStats, PaginatedAuditLogs } from "../types/audit";

export async function getAuditLogs(filters?: AuditFilters) { const { data } = await api.get<PaginatedAuditLogs>("/audit/logs/", { params: filters }); return data; }
export async function getAuditLog(id: number | string) { const { data } = await api.get<AuditLog>(`/audit/logs/${id}/`); return data; }
export async function getAuditStats(filters?: AuditFilters) { const { data } = await api.get<AuditStats>("/audit/stats/", { params: filters }); return data; }
export async function getMyActivity(filters?: AuditFilters) { const { data } = await api.get<PaginatedAuditLogs>("/audit/logs/my-activity/", { params: filters }); return data; }

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportAuditExcel(filters?: AuditFilters) {
  const { data } = await api.get<Blob>("/audit/logs/export-excel/", { params: filters, responseType: "blob" });
  downloadBlob(data, "auditoria.xlsx");
}

export async function exportAuditPdf(filters?: AuditFilters) {
  const { data } = await api.get<Blob>("/audit/logs/export-pdf/", { params: filters, responseType: "blob" });
  downloadBlob(data, "auditoria.pdf");
}
