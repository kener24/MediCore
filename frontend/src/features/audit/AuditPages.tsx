import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { getAuditLog, getAuditLogs, getAuditStats } from "../../api/auditApi";
import { getErrorMessage } from "../../api/axios";
import { AuditActionBadge, AuditModuleBadge, AuditSeverityBadge } from "../../components/ui/AuditBadges";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { AuditFilters, AuditLog, AuditStats } from "../../types/audit";

function JsonBox({ value }: { value?: Record<string, unknown> }) {
  return <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

export function AuditDashboardPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const [stats, setStats] = useState<AuditStats | null>(null);
  useEffect(() => { getAuditStats().then(setStats).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!stats) return <Loader />;
  const topModule = stats.top_modules[0]?.module ?? "-";
  return <div className="space-y-6"><PageHeader title="Auditoria" description="Eventos de seguridad y trazabilidad del sistema." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to={`${basePath}/logs`}>Ver bitacora</Link>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total eventos" value={stats.total_logs} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Eventos hoy" value={stats.logs_today} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Advertencias" value={stats.warnings} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Errores" value={stats.errors} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Criticos" value={stats.critical} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Logins OK" value={stats.login_success} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Logins fallidos" value={stats.login_failed} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Modulo activo" value={topModule} icon={<ShieldCheck className="h-5 w-5" />} /></div><div className="grid gap-4 lg:grid-cols-2"><Card title="Acciones principales"><Table data={stats.top_actions} columns={[{ key: "action", header: "Accion", render: (i) => i.action }, { key: "count", header: "Eventos", render: (i) => i.count }]} /></Card><Card title="Modulos principales"><Table data={stats.top_modules} columns={[{ key: "module", header: "Modulo", render: (i) => i.module }, { key: "count", header: "Eventos", render: (i) => i.count }]} /></Card></div></div>;
}

export function AuditLogsPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const [filters, setFilters] = useState<AuditFilters>({ page_size: "25" });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  async function load(nextFilters = filters) { setLoading(true); try { const data = await getAuditLogs(nextFilters); setLogs(data.results); setCount(data.count); } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  function submit(e: FormEvent) { e.preventDefault(); load({ ...filters, page: "1" }); }
  function clear() { const clean = { page_size: "25" }; setFilters(clean); load(clean); }
  return <div className="space-y-6"><PageHeader title="Bitacora" description="Consulta eventos por fecha, accion, modulo y severidad." /><Card><form className="mb-4 grid gap-2 lg:grid-cols-[1fr_130px_130px_130px_130px_130px_auto_auto]" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" placeholder="Buscar" value={filters.search ?? ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={filters.action ?? ""} onChange={(e) => setFilters({ ...filters, action: e.target.value })}><option value="">Accion</option><option value="login_success">login_success</option><option value="login_failed">login_failed</option><option value="create">create</option><option value="update">update</option><option value="cancel">cancel</option><option value="payment">payment</option><option value="stock_in">stock_in</option><option value="purchase_receive">purchase_receive</option></select><select className="h-10 rounded-md border px-3 text-sm" value={filters.module ?? ""} onChange={(e) => setFilters({ ...filters, module: e.target.value })}><option value="">Modulo</option><option value="auth">auth</option><option value="patients">patients</option><option value="appointments">appointments</option><option value="payments">payments</option><option value="inventory">inventory</option><option value="purchases">purchases</option></select><select className="h-10 rounded-md border px-3 text-sm" value={filters.severity ?? ""} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}><option value="">Severidad</option><option value="info">info</option><option value="warning">warning</option><option value="error">error</option><option value="critical">critical</option></select><input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Filtrar</button><button className="h-10 rounded-md border px-4 text-sm font-semibold" type="button" onClick={clear}>Limpiar</button></form>{loading ? <Loader /> : logs.length ? <><p className="mb-3 text-sm text-slate-500">{count} eventos encontrados</p><Table data={logs} columns={[{ key: "date", header: "Fecha", render: (i) => new Date(i.created_at).toLocaleString() }, { key: "user", header: "Usuario", render: (i) => i.user_nombre || i.user_email || "-" }, { key: "clinic", header: "Clinica", render: (i) => i.clinic_nombre || "-" }, { key: "action", header: "Accion", render: (i) => <AuditActionBadge action={i.action} /> }, { key: "module", header: "Modulo", render: (i) => <AuditModuleBadge module={i.module} /> }, { key: "description", header: "Descripcion", render: (i) => i.description || i.object_repr || "-" }, { key: "severity", header: "Severidad", render: (i) => <AuditSeverityBadge severity={i.severity} /> }, { key: "ip", header: "IP", render: (i) => i.ip_address || "-" }, { key: "actions", header: "Acciones", render: (i) => <Link className="rounded-md border px-2 py-1 text-xs font-semibold" to={`${basePath}/logs/${i.id}`}>Ver</Link> }]} /></> : <EmptyState title="No hay eventos." description="Ajusta los filtros o genera actividad en el sistema." />}</Card></div>;
}

export function AuditLogDetailsPage({ basePath = "/clinic/audit" }: { basePath?: string }) {
  const { id } = useParams();
  const [log, setLog] = useState<AuditLog | null>(null);
  useEffect(() => { if (id) getAuditLog(id).then(setLog).catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!log) return <Loader />;
  return <div className="space-y-6"><PageHeader title={`Evento #${log.id}`} description={log.description || log.object_repr || "Detalle de auditoria"} actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to={`${basePath}/logs`}>Volver</Link>} /><Card title="Datos del evento"><div className="grid gap-4 text-sm md:grid-cols-3"><Info label="Fecha" value={new Date(log.created_at).toLocaleString()} /><Info label="Usuario" value={log.user_nombre || log.user_email || "-"} /><Info label="Clinica" value={log.clinic_nombre || "-"} /><Info label="Accion" value={log.action} /><Info label="Modulo" value={log.module} /><Info label="Severidad" value={log.severity} /><Info label="Modelo" value={log.model_name || "-"} /><Info label="Objeto ID" value={log.object_id || "-"} /><Info label="Objeto" value={log.object_repr || "-"} /><Info label="IP" value={log.ip_address || "-"} /><Info label="Metodo" value={log.request_method || "-"} /><Info label="Ruta" value={log.request_path || "-"} /></div><p className="mt-4 text-sm text-slate-600"><b>User agent:</b> {log.user_agent || "-"}</p></Card><div className="grid gap-4 lg:grid-cols-3"><Card title="Valores anteriores"><JsonBox value={log.old_values} /></Card><Card title="Valores nuevos"><JsonBox value={log.new_values} /></Card><Card title="Metadata"><JsonBox value={log.metadata} /></Card></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900 break-words">{value}</p></div>;
}
