import api from "./axios";
import type { AppointmentReport, ClinicDashboardReport, FinancialReport, InventoryReport, PurchaseReport, ReportDateFilters, SuperAdminDashboardReport } from "../types/report";

export async function getClinicDashboardReport(filters?: ReportDateFilters) { const { data } = await api.get<ClinicDashboardReport>("/reports/clinic-dashboard/", { params: filters }); return data; }
export async function getSuperAdminDashboardReport(filters?: ReportDateFilters) { const { data } = await api.get<SuperAdminDashboardReport>("/reports/superadmin-dashboard/", { params: filters }); return data; }
export async function getAppointmentsReport(filters?: ReportDateFilters) { const { data } = await api.get<AppointmentReport>("/reports/appointments/", { params: filters }); return data; }
export async function getPatientsReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/patients/", { params: filters }); return data; }
export async function getDoctorsReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/doctors/", { params: filters }); return data; }
export async function getConsultationsReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/consultations/", { params: filters }); return data; }
export async function getFinancialReport(filters?: ReportDateFilters) { const { data } = await api.get<FinancialReport>("/reports/financial/", { params: filters }); return data; }
export async function getCashReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/cash/", { params: filters }); return data; }
export async function getInventoryReport(filters?: ReportDateFilters) { const { data } = await api.get<InventoryReport>("/reports/inventory/", { params: filters }); return data; }
export async function getPurchasesReport(filters?: ReportDateFilters) { const { data } = await api.get<PurchaseReport>("/reports/purchases/", { params: filters }); return data; }
export async function getDoctorDashboardReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/doctor-dashboard/", { params: filters }); return data; }
export async function getReceptionDashboardReport(filters?: ReportDateFilters) { const { data } = await api.get<Record<string, unknown>>("/reports/reception-dashboard/", { params: filters }); return data; }

async function downloadReport(path: string, filename: string, filters?: ReportDateFilters) {
  const response = await api.get<Blob>(path, { params: filters, responseType: "blob" });
  const { data } = response;
  const disposition = response.headers["content-disposition"];
  const match = typeof disposition === "string" ? disposition.match(/filename="?([^"]+)"?/i) : null;
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportReportExcel(report: string, filters?: ReportDateFilters) {
  return downloadReport(`/reports/${report}/export-excel/`, `${report}.xlsx`, filters);
}

export async function exportReportPdf(report: string, filters?: ReportDateFilters) {
  return downloadReport(`/reports/${report}/export-pdf/`, `${report}.pdf`, filters);
}
