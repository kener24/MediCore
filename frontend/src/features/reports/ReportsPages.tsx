import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BarChart3, CalendarClock, ClipboardList, DollarSign, Package, ShoppingCart, Stethoscope, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

import { exportReportExcel, exportReportPdf, getAppointmentsReport, getCashReport, getClinicDashboardReport, getConsultationsReport, getDoctorDashboardReport, getDoctorsReport, getFinancialReport, getInventoryReport, getPatientsReport, getPurchasesReport, getReceptionDashboardReport, getSuperAdminDashboardReport } from "../../api/reportsApi";
import { getErrorMessage } from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { ReportDateFilters } from "../../types/report";

const money = (value?: string | number | null) => `L ${Number(value ?? 0).toFixed(2)}`;
const asNumber = (value: unknown) => Number(value ?? 0);
const today = new Date();
const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const defaultTo = today.toISOString().slice(0, 10);

function ReportFilters({ filters, onChange }: { filters: ReportDateFilters; onChange: (filters: ReportDateFilters) => void }) {
  return <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row"><input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_from ?? ""} onChange={(e) => onChange({ ...filters, date_from: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_to ?? ""} onChange={(e) => onChange({ ...filters, date_to: e.target.value })} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" onClick={() => onChange({ ...filters })}>Actualizar</button><button className="h-10 rounded-md border px-4 text-sm font-semibold text-slate-700" onClick={() => onChange({ date_from: defaultFrom, date_to: defaultTo })}>Limpiar</button></div>;
}

function ExportButtons({ report, filters }: { report: string; filters: ReportDateFilters }) {
  async function run(kind: "excel" | "pdf") {
    try {
      if (kind === "excel") await exportReportExcel(report, filters);
      else await exportReportPdf(report, filters);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  return <div className="flex flex-wrap gap-2"><button className="h-10 rounded-md border px-4 text-sm font-semibold text-slate-700" onClick={() => run("excel")}>Exportar Excel</button><button className="h-10 rounded-md border px-4 text-sm font-semibold text-slate-700" onClick={() => run("pdf")}>Exportar PDF</button></div>;
}

function SimpleBars({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data).map(Number), 1);
  return <div className="space-y-3">{Object.entries(data).map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(Number(value) / max) * 100}%` }} /></div></div>)}</div>;
}

function MiniTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const keys = Object.keys(rows[0] ?? {}).slice(0, 4);
  if (!rows.length) return <p className="text-sm text-slate-500">No hay datos para el periodo seleccionado.</p>;
  return <Table<Record<string, unknown>> data={rows} columns={keys.map((key) => ({ key, header: key.replace(/_/g, " "), render: (row) => String(row[key] ?? "-") }))} />;
}

function GenericReportPage({ title, description, report, loader, cards, bars, tables }: { title: string; description: string; report: string; loader: (filters: ReportDateFilters) => Promise<Record<string, unknown>>; cards: Array<[string, string]>; bars?: Array<[string, string]>; tables?: Array<[string, string]> }) {
  const [filters, setFilters] = useState<ReportDateFilters>({ date_from: defaultFrom, date_to: defaultTo });
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { loader(filters).then(setData).catch((e) => toast.error(getErrorMessage(e))); }, [filters.date_from, filters.date_to]);
  if (!data) return <Loader />;
  return <div className="space-y-6"><PageHeader title={title} description={description} actions={<ExportButtons report={report} filters={filters} />} /><ReportFilters filters={filters} onChange={setFilters} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, key]) => <StatCard key={key} label={label} value={String(data[key] ?? 0)} icon={<BarChart3 className="h-5 w-5" />} />)}</div>{bars?.map(([label, key]) => <Card key={key} title={label}><SimpleBars data={(data[key] as Record<string, number>) ?? {}} /></Card>)}{tables?.map(([label, key]) => <Card key={key} title={label}><MiniTable rows={(data[key] as Array<Record<string, unknown>>) ?? []} /></Card>)}</div>;
}

const reportCards = [
  { title: "Citas", desc: "Estados, volumen diario y medicos.", href: "/clinic/reports/appointments", icon: CalendarClock },
  { title: "Pacientes", desc: "Altas, estado y distribucion.", href: "/clinic/reports/patients", icon: Users },
  { title: "Medicos", desc: "Productividad y actividad clinica.", href: "/clinic/reports/doctors", icon: Stethoscope },
  { title: "Consultas", desc: "Consultas por dia y diagnosticos.", href: "/clinic/reports/consultations", icon: ClipboardList },
  { title: "Finanzas", desc: "Facturacion, pagos y saldos.", href: "/clinic/reports/financial", icon: DollarSign },
  { title: "Caja", desc: "Sesiones, efectivo y diferencias.", href: "/clinic/reports/cash", icon: Wallet },
  { title: "Inventario", desc: "Stock, vencimientos y movimientos.", href: "/clinic/reports/inventory", icon: Package },
  { title: "Compras", desc: "Proveedores, estados y productos.", href: "/clinic/reports/purchases", icon: ShoppingCart },
];

export function ReportsHomePage() {
  return <div className="space-y-6"><PageHeader title="Reportes" description="Analitica operativa, clinica, financiera e inventario." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{reportCards.map((item) => { const Icon = item.icon; return <Card key={item.href}><div className="flex h-full flex-col gap-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" /></span><h2 className="font-semibold text-slate-900">{item.title}</h2></div><p className="text-sm text-slate-500">{item.desc}</p><Link className="mt-auto rounded-md border px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" to={item.href}>Ver reporte</Link></div></Card>; })}</div></div>;
}

export function ClinicDashboardAnalyticsPage() {
  const [filters, setFilters] = useState<ReportDateFilters>({ date_from: defaultFrom, date_to: defaultTo });
  const [data, setData] = useState<any>(null);
  useEffect(() => { getClinicDashboardReport(filters).then(setData).catch((e) => toast.error(getErrorMessage(e))); }, [filters.date_from, filters.date_to]);
  if (!data) return <Loader />;
  const s = data.summary;
  return <div className="space-y-6"><PageHeader title="Dashboard analitico" description="KPIs principales de la clinica." actions={<ExportButtons report="clinic-dashboard" filters={filters} />} /><ReportFilters filters={filters} onChange={setFilters} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Pacientes" value={s.total_patients} icon={<Users className="h-5 w-5" />} /><StatCard label="Citas" value={s.total_appointments} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Facturado" value={money(s.total_invoiced)} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Bajo stock" value={s.low_stock_items} icon={<Package className="h-5 w-5" />} /></div><div className="grid gap-4 lg:grid-cols-2"><Card title="Citas por estado"><SimpleBars data={data.appointments_by_status} /></Card><Card title="Top medicos"><MiniTable rows={data.top_doctors ?? []} /></Card></div></div>;
}

export function AppointmentsReportPage() { return <GenericReportPage report="appointments" title="Reporte de citas" description="Volumen, estados y ausencias." loader={getAppointmentsReport as any} cards={[["Total citas", "total_appointments"], ["Cancelacion", "cancellation_rate"], ["No asistencia", "no_show_rate"]]} bars={[["Citas por estado", "appointments_by_status"]]} tables={[["Citas por medico", "appointments_by_doctor"], ["Citas por dia", "appointments_by_day"]]} />; }
export function PatientsReportPage() { return <GenericReportPage report="patients" title="Reporte de pacientes" description="Altas y distribucion de pacientes." loader={getPatientsReport} cards={[["Total pacientes", "total_patients"], ["Nuevos", "new_patients"], ["Activos", "active_patients"], ["Inactivos", "inactive_patients"]]} bars={[["Pacientes por genero", "patients_by_gender"]]} tables={[["Pacientes por mes", "patients_by_month"]]} />; }
export function DoctorsReportPage() { return <GenericReportPage report="doctors" title="Reporte de medicos" description="Actividad y productividad medica." loader={getDoctorsReport} cards={[["Total medicos", "total_doctors"], ["Activos", "active_doctors"], ["Promedio consultas", "average_consultations_per_doctor"]]} tables={[["Consultas por medico", "consultations_by_doctor"], ["Citas por medico", "appointments_by_doctor"]]} />; }
export function ConsultationsReportPage() { return <GenericReportPage report="consultations" title="Reporte de consultas" description="Consultas, estado y diagnosticos frecuentes." loader={getConsultationsReport} cards={[["Total consultas", "total_consultations"], ["Borrador", "draft_consultations"], ["Finalizadas", "finalized_consultations"]]} tables={[["Consultas por dia", "consultations_by_day"], ["Consultas por medico", "consultations_by_doctor"], ["Diagnosticos frecuentes", "most_common_diagnoses"]]} />; }
export function FinancialReportPage() { return <GenericReportPage report="financial" title="Reporte financiero" description="Facturacion, pagos y ticket promedio." loader={getFinancialReport as any} cards={[["Facturado", "total_invoiced"], ["Pagado", "total_paid"], ["Pendiente", "total_pending"], ["Ticket promedio", "average_ticket"]]} bars={[["Facturas por estado", "invoices_by_status"], ["Pagos por metodo", "payments_by_method"]]} tables={[["Ingresos por dia", "revenue_by_day"], ["Servicios principales", "top_services"]]} />; }
export function CashReportPage() { return <GenericReportPage report="cash" title="Reporte de caja" description="Sesiones, efectivo, ingresos y egresos." loader={getCashReport} cards={[["Sesiones", "total_cash_sessions"], ["Abiertas", "open_cash_sessions"], ["Cerradas", "closed_cash_sessions"], ["Efectivo recibido", "cash_received"], ["Ingresos", "cash_movements_income"], ["Egresos", "cash_movements_expense"], ["Diferencias", "differences_total"]]} tables={[["Resumen por usuario", "sessions_summary"]]} />; }
export function InventoryReportPage() { return <GenericReportPage report="inventory" title="Reporte de inventario" description="Stock, valor y alertas." loader={getInventoryReport as any} cards={[["Productos", "total_items"], ["Activos", "active_items"], ["Bajo stock", "low_stock_items"], ["Vencidos", "expired_lots"], ["Por vencer", "expiring_soon_lots"], ["Valor stock", "total_stock_value"]]} tables={[["Stock por categoria", "stock_by_category"], ["Stock por tipo", "stock_by_type"], ["Mas movidos", "most_moved_items"]]} />; }
export function PurchasesReportPage() { return <GenericReportPage report="purchases" title="Reporte de compras" description="Ordenes, proveedores y productos comprados." loader={getPurchasesReport as any} cards={[["Ordenes", "total_purchase_orders"], ["Total comprado", "total_purchased_amount"], ["Recepciones pendientes", "pending_receipts"]]} bars={[["Compras por estado", "purchases_by_status"]]} tables={[["Compras por proveedor", "purchases_by_supplier"], ["Compras por mes", "purchases_by_month"], ["Productos mas comprados", "top_purchased_items"]]} />; }

export function SuperAdminReportsPage() {
  const [filters, setFilters] = useState<ReportDateFilters>({ date_from: defaultFrom, date_to: defaultTo });
  const [data, setData] = useState<any>(null);
  useEffect(() => { getSuperAdminDashboardReport(filters).then(setData).catch((e) => toast.error(getErrorMessage(e))); }, [filters.date_from, filters.date_to]);
  if (!data) return <Loader />;
  const s = data.summary;
  return <div className="space-y-6"><PageHeader title="Reportes globales" description="Metricas generales del SaaS y clinicas." actions={<ExportButtons report="superadmin-dashboard" filters={filters} />} /><ReportFilters filters={filters} onChange={setFilters} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Clinicas" value={s.total_clinics} icon={<BarChart3 className="h-5 w-5" />} /><StatCard label="Usuarios" value={s.total_users} icon={<Users className="h-5 w-5" />} /><StatCard label="Pacientes" value={s.total_patients} icon={<Users className="h-5 w-5" />} /><StatCard label="Revenue" value={money(s.total_revenue)} icon={<DollarSign className="h-5 w-5" />} /></div><Card title="Clinicas"><MiniTable rows={data.clinics_overview ?? []} /></Card></div>;
}

export function DoctorDashboardAnalyticsPage() {
  const filters: ReportDateFilters = { date_from: defaultFrom, date_to: defaultTo };
  const [data, setData] = useState<any>(null);
  useEffect(() => { getDoctorDashboardReport(filters).then(setData).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!data) return <Loader />;
  const s = data.summary;
  return <div className="space-y-6"><PageHeader title="Mis reportes" description="Resumen de citas y consultas medicas." actions={<ExportButtons report="doctor-dashboard" filters={filters} />} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Citas hoy" value={s.appointments_today} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Proximas" value={s.upcoming_appointments} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Completadas" value={s.completed_consultations} icon={<ClipboardList className="h-5 w-5" />} /><StatCard label="Pendientes" value={s.pending_consultations} icon={<ClipboardList className="h-5 w-5" />} /><StatCard label="Pacientes" value={s.patients_attended} icon={<Users className="h-5 w-5" />} /></div><Card title="Citas por estado"><SimpleBars data={data.appointments_by_status ?? {}} /></Card></div>;
}

export function ReceptionDashboardPage() {
  const filters: ReportDateFilters = { date_from: defaultFrom, date_to: defaultTo };
  const [data, setData] = useState<any>(null);
  useEffect(() => { getReceptionDashboardReport().then(setData).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!data) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Dashboard recepcion" description="Actividad del dia para recepcion." actions={<ExportButtons report="reception-dashboard" filters={filters} />} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Citas hoy" value={data.appointments_today} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Citas pendientes" value={data.pending_appointments} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Pacientes hoy" value={data.patients_registered_today} icon={<Users className="h-5 w-5" />} /><StatCard label="Pagos hoy" value={money(data.payments_today)} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Facturas pendientes" value={data.pending_invoices} icon={<Wallet className="h-5 w-5" />} /><StatCard label="Caja actual" value={data.current_cash ? money(data.current_cash.expected_amount) : "Sin caja"} icon={<Wallet className="h-5 w-5" />} /></div></div>;
}
