import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { exportAuditExcel, exportAuditPdf, getAuditLog, getAuditLogs, getAuditStats } from "../../api/auditApi";
import { getErrorMessage } from "../../api/axios";
import { AuditActionBadge, AuditModuleBadge, AuditSeverityBadge } from "../../components/ui/AuditBadges";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { AuditFilters, AuditLog, AuditStats } from "../../types/audit";

const actions = ["login_success", "login_failed", "logout", "create", "update", "delete", "view", "export", "print", "download", "approve", "reject", "cancel", "complete", "finalize", "invoice", "payment", "stock_in", "stock_out", "password_change", "permission_change", "settings_change"];
const modules = ["auth", "users", "clinics", "patients", "appointments", "admissions", "triage", "consultations", "prescriptions", "medical_orders", "billing", "payments", "cash", "inventory", "purchases", "documents", "reports", "settings", "subscriptions", "security"];

function JsonBox({ value }: { value?: Record<string, unknown> }) {
  return <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

export function AuditDashboardPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const [stats, setStats] = useState<AuditStats | null>(null);
  useEffect(() => { getAuditStats().then(setStats).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!stats) return <Loader />;
  const topModule = stats.top_modules[0]?.module ?? "-";
  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Eventos de seguridad y trazabilidad del sistema." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to={`${basePath}/logs`}>Ver bitacora</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total eventos" value={stats.total_logs} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Eventos hoy" value={stats.logs_today} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Advertencias" value={stats.warnings} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Fallidos" value={stats.failed ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Criticos" value={stats.critical} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Logins OK" value={stats.login_success} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Logins fallidos" value={stats.login_failed} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Modulo activo" value={topModule} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Acciones principales"><Table data={stats.top_actions} columns={[{ key: "action", header: "Accion", render: (i) => i.action }, { key: "count", header: "Eventos", render: (i) => i.count }]} /></Card>
        <Card title="Modulos principales"><Table data={stats.top_modules} columns={[{ key: "module", header: "Modulo", render: (i) => i.module }, { key: "count", header: "Eventos", render: (i) => i.count }]} /></Card>
      </div>
    </div>
  );
}

export function AuditLogsPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const [filters, setFilters] = useState<AuditFilters>({ page_size: "25", page: "1" });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load(nextFilters = filters) {
    setLoading(true);
    try {
      const data = await getAuditLogs(nextFilters);
      setLogs(data.results);
      setCount(data.count);
      setFilters(nextFilters);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  function submit(e: FormEvent) { e.preventDefault(); load({ ...filters, page: "1" }); }
  function clear() { load({ page_size: "25", page: "1" }); }
  const page = Number(filters.page ?? "1");
  const pageSize = Number(filters.page_size ?? "25");
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  async function exportFile(type: "excel" | "pdf") {
    try {
      if (type === "excel") await exportAuditExcel(filters);
      else await exportAuditPdf(filters);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitacora"
        description="Consulta eventos por fecha, usuario, modulo, accion y severidad."
        actions={<div className="flex gap-2"><button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" type="button" onClick={() => exportFile("excel")}><Download className="h-4 w-4" />Excel</button><button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" type="button" onClick={() => exportFile("pdf")}><FileText className="h-4 w-4" />PDF</button></div>}
      />
      <Card>
        <form className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5" onSubmit={submit}>
          <input className="h-10 rounded-md border px-3 text-sm" placeholder="Buscar descripcion, ruta o usuario" value={filters.search ?? ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <input className="h-10 rounded-md border px-3 text-sm" placeholder="Usuario ID" value={filters.user ?? ""} onChange={(e) => setFilters({ ...filters, user: e.target.value })} />
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.action ?? ""} onChange={(e) => setFilters({ ...filters, action: e.target.value })}><option value="">Accion</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.module ?? ""} onChange={(e) => setFilters({ ...filters, module: e.target.value })}><option value="">Modulo</option>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.severity ?? ""} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}><option value="">Severidad</option><option value="info">info</option><option value="warning">warning</option><option value="error">error</option><option value="critical">critical</option></select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Estado</option><option value="success">success</option><option value="failed">failed</option><option value="warning">warning</option></select>
          <input className="h-10 rounded-md border px-3 text-sm" placeholder="Objeto" value={filters.object_type ?? filters.model_name ?? ""} onChange={(e) => setFilters({ ...filters, object_type: e.target.value, model_name: undefined })} />
          <input className="h-10 rounded-md border px-3 text-sm" placeholder="Objeto ID" value={filters.object_id ?? ""} onChange={(e) => setFilters({ ...filters, object_id: e.target.value })} />
          <input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <div className="flex gap-2 xl:col-span-5">
            <button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Filtrar</button>
            <button className="h-10 rounded-md border px-4 text-sm font-semibold" type="button" onClick={clear}>Limpiar</button>
          </div>
        </form>
        {loading ? <Loader /> : logs.length ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <p>{count} eventos encontrados</p>
              <div className="flex items-center gap-2">
                <button className="rounded-md border px-3 py-1 font-semibold disabled:opacity-50" type="button" disabled={page <= 1} onClick={() => load({ ...filters, page: String(page - 1) })}>Anterior</button>
                <span>Pagina {page} de {totalPages}</span>
                <button className="rounded-md border px-3 py-1 font-semibold disabled:opacity-50" type="button" disabled={page >= totalPages} onClick={() => load({ ...filters, page: String(page + 1) })}>Siguiente</button>
              </div>
            </div>
            <Table data={logs} columns={[
              { key: "date", header: "Fecha", render: (i) => new Date(i.created_at).toLocaleString() },
              { key: "user", header: "Usuario", render: (i) => i.user_nombre || i.user_email || "-" },
              { key: "role", header: "Rol", render: (i) => i.user_role || "-" },
              { key: "clinic", header: "Clinica", render: (i) => i.clinic_nombre || "-" },
              { key: "action", header: "Accion", render: (i) => <AuditActionBadge action={i.action} /> },
              { key: "module", header: "Modulo", render: (i) => <AuditModuleBadge module={i.module} /> },
              { key: "description", header: "Descripcion", render: (i) => i.description || i.object_repr || "-" },
              { key: "severity", header: "Severidad", render: (i) => <AuditSeverityBadge severity={i.severity} /> },
              { key: "status", header: "Estado", render: (i) => i.status || "success" },
              { key: "ip", header: "IP", render: (i) => i.ip_address || "-" },
              { key: "actions", header: "Acciones", render: (i) => <Link className="rounded-md border px-2 py-1 text-xs font-semibold" to={`${basePath}/logs/${i.id}`}>Ver</Link> },
            ]} />
          </>
        ) : <EmptyState title="No hay eventos." description="Ajusta los filtros o genera actividad en el sistema." />}
      </Card>
    </div>
  );
}

export function AuditLogDetailsPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const { id } = useParams();
  const [log, setLog] = useState<AuditLog | null>(null);
  useEffect(() => { if (id) getAuditLog(id).then(setLog).catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!log) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title={`Evento #${log.id}`} description={log.description || log.object_repr || "Detalle de auditoria"} actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to={`${basePath}/logs`}>Volver</Link>} />
      <Card title="Datos del evento">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Fecha" value={new Date(log.created_at).toLocaleString()} />
          <Info label="Usuario" value={log.user_nombre || log.user_email || "-"} />
          <Info label="Rol" value={log.user_role || "-"} />
          <Info label="Clinica" value={log.clinic_nombre || "-"} />
          <Info label="Accion" value={log.action} />
          <Info label="Modulo" value={log.module} />
          <Info label="Severidad" value={log.severity} />
          <Info label="Estado" value={log.status || "success"} />
          <Info label="Objeto" value={log.object_type || log.model_name || "-"} />
          <Info label="Objeto ID" value={log.object_id || "-"} />
          <Info label="Representacion" value={log.object_repr || "-"} />
          <Info label="IP" value={log.ip_address || "-"} />
          <Info label="Metodo" value={log.request_method || "-"} />
          <Info label="Ruta" value={log.request_path || "-"} />
        </div>
        <p className="mt-4 text-sm text-slate-600"><b>User agent:</b> {log.user_agent || "-"}</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Antes"><JsonBox value={log.before_data ?? log.old_values} /></Card>
        <Card title="Despues"><JsonBox value={log.after_data ?? log.new_values} /></Card>
        <Card title="Cambios"><JsonBox value={log.changes ?? log.metadata} /></Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-medium text-slate-900">{value}</p></div>;
}
