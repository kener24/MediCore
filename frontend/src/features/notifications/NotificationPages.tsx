import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Bell, CheckCheck, Inbox, RotateCcw, Settings, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { archiveNotification, generateAppointmentReminders, generateBillingAlerts, generateInventoryAlerts, getNotification, getNotificationPreferences, getNotificationStats, getNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, updateNotificationPreferences } from "../../api/notificationsApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { NotificationPriorityBadge, NotificationStatusBadge, NotificationTypeBadge } from "../../components/ui/NotificationBadges";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import type { Notification, NotificationFilters, NotificationPreference, NotificationStats } from "../../types/notification";

const modules = ["appointments", "billing", "inventory", "purchases", "audit", "system", "prescriptions", "payments"];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function JsonBox({ value }: { value?: Record<string, unknown> }) {
  return <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

export function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>({ page_size: "25" });
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load(nextFilters = filters) {
    setLoading(true);
    try {
      const data = await getNotifications(nextFilters);
      setItems(data.results);
      setCount(data.count);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    load({ ...filters, page: "1" });
  }

  function clear() {
    const clean = { page_size: "25" };
    setFilters(clean);
    load(clean);
  }

  async function updateItem(action: () => Promise<Notification>) {
    try {
      await action();
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function readAll() {
    try {
      const data = await markAllNotificationsRead();
      await load();
      toast.success(`${data.updated} notificaciones marcadas como leidas.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Recordatorios, alertas y avisos del sistema."
        actions={<div className="flex flex-wrap gap-2"><Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/notifications/preferences"><Settings className="h-4 w-4" />Preferencias</Link><Button icon={<CheckCheck className="h-4 w-4" />} onClick={readAll}>Marcar todo leido</Button></div>}
      />
      <Card>
        <form className="mb-4 grid gap-2 lg:grid-cols-[1fr_140px_140px_140px_140px_auto_auto]" onSubmit={submit}>
          <input className="h-10 rounded-md border px-3 text-sm" placeholder="Buscar" value={filters.search ?? ""} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.status ?? ""} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Estado</option><option value="unread">unread</option><option value="read">read</option><option value="archived">archived</option>
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.notification_type ?? ""} onChange={(event) => setFilters({ ...filters, notification_type: event.target.value })}>
            <option value="">Tipo</option><option value="info">info</option><option value="reminder">reminder</option><option value="alert">alert</option><option value="warning">warning</option><option value="success">success</option><option value="error">error</option>
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.module ?? ""} onChange={(event) => setFilters({ ...filters, module: event.target.value })}>
            <option value="">Modulo</option>{modules.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={filters.priority ?? ""} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
            <option value="">Prioridad</option><option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option>
          </select>
          <button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Filtrar</button>
          <button className="h-10 rounded-md border px-4 text-sm font-semibold" type="button" onClick={clear}>Limpiar</button>
        </form>
        {loading ? <Loader /> : items.length ? (
          <>
            <p className="mb-3 text-sm text-slate-500">{count} notificaciones encontradas</p>
            <Table<Notification> data={items} columns={[
              { key: "title", header: "Notificacion", render: (item) => <div><Link className="font-semibold text-slate-900 hover:text-brand-700" to={`/notifications/${item.id}`}>{item.title}</Link><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.message}</p></div> },
              { key: "type", header: "Tipo", render: (item) => <NotificationTypeBadge type={item.notification_type} /> },
              { key: "priority", header: "Prioridad", render: (item) => <NotificationPriorityBadge priority={item.priority} /> },
              { key: "status", header: "Estado", render: (item) => <NotificationStatusBadge status={item.status} /> },
              { key: "module", header: "Modulo", render: (item) => item.module },
              { key: "date", header: "Fecha", render: (item) => formatDate(item.creado_en) },
              { key: "actions", header: "Acciones", render: (item) => <div className="flex gap-1"><button className="rounded-md border p-2 text-slate-600 hover:bg-slate-50" onClick={() => updateItem(() => item.status === "unread" ? markNotificationRead(item.id) : markNotificationUnread(item.id))} type="button" title={item.status === "unread" ? "Marcar leida" : "Marcar no leida"}>{item.status === "unread" ? <CheckCheck className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</button><button className="rounded-md border p-2 text-rose-600 hover:bg-rose-50" onClick={() => updateItem(() => archiveNotification(item.id))} type="button" title="Archivar"><Trash2 className="h-4 w-4" /></button></div> },
            ]} />
          </>
        ) : <EmptyState title="No hay notificaciones." description="Cuando el sistema genere avisos apareceran aqui." />}
      </Card>
    </div>
  );
}

export function NotificationDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Notification | null>(null);
  useEffect(() => { if (id) getNotification(id).then(setItem).catch((error) => toast.error(getErrorMessage(error))); }, [id]);
  if (!item) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title={item.title} description={item.message} actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to="/notifications">Volver</Link>} />
      <Card title="Detalle">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Tipo" value={item.notification_type} />
          <Info label="Modulo" value={item.module} />
          <Info label="Prioridad" value={item.priority} />
          <Info label="Estado" value={item.status} />
          <Info label="Clinica" value={item.clinic_nombre || "-"} />
          <Info label="Fecha" value={formatDate(item.creado_en)} />
          <Info label="Leida" value={formatDate(item.read_at)} />
          <Info label="Modelo relacionado" value={item.related_model || "-"} />
          <Info label="Objeto relacionado" value={item.related_object_id || "-"} />
        </div>
        {item.action_url ? <Link className="mt-5 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to={item.action_url}>Abrir accion</Link> : null}
      </Card>
      <Card title="Metadata"><JsonBox value={item.metadata} /></Card>
    </div>
  );
}

export function NotificationPreferencesPage() {
  const { user } = useAuth();
  const roleName = user?.role_nombre ?? (typeof user?.role === "object" ? user.role.nombre : "");
  const isPatient = roleName === "paciente";
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getNotificationPreferences()
      .then((data) => setPrefs(isPatient ? { ...data, receive_inventory_alerts: false, receive_purchase_alerts: false, receive_audit_alerts: false } : data))
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [isPatient]);
  if (!prefs) return <Loader />;

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      const payload = isPatient ? { ...prefs, receive_inventory_alerts: false, receive_purchase_alerts: false, receive_audit_alerts: false } : prefs;
      setPrefs(await updateNotificationPreferences(payload));
      toast.success("Preferencias actualizadas.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function toggle(field: keyof NotificationPreference) {
    setPrefs((current) => current ? { ...current, [field]: !current[field] } : current);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Preferencias de notificaciones" description="Configura que avisos quieres recibir." actions={<Button isLoading={saving} onClick={save} icon={<Settings className="h-4 w-4" />}>Guardar</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Eventos">
          <div className="grid gap-3">
            <Check label="Recordatorios de citas" checked={prefs.receive_appointment_reminders} onChange={() => toggle("receive_appointment_reminders")} />
            <Check label="Alertas de facturacion" checked={prefs.receive_billing_alerts} onChange={() => toggle("receive_billing_alerts")} />
            <Check label="Alertas de inventario" checked={prefs.receive_inventory_alerts} disabled={isPatient} onChange={() => toggle("receive_inventory_alerts")} />
            <Check label="Alertas de compras" checked={prefs.receive_purchase_alerts} disabled={isPatient} onChange={() => toggle("receive_purchase_alerts")} />
            <Check label="Alertas de auditoria" checked={prefs.receive_audit_alerts} disabled={isPatient} onChange={() => toggle("receive_audit_alerts")} />
            <Check label="Avisos del sistema" checked={prefs.receive_system_notifications} onChange={() => toggle("receive_system_notifications")} />
          </div>
        </Card>
        <Card title="Canales">
          <div className="grid gap-3">
            <Check label="Email" checked={prefs.email_enabled} onChange={() => toggle("email_enabled")} />
            <Check label="SMS" checked={prefs.sms_enabled} onChange={() => toggle("sms_enabled")} />
            <Check label="WhatsApp" checked={prefs.whatsapp_enabled} onChange={() => toggle("whatsapp_enabled")} />
            <Check label="Push interno" checked={prefs.push_enabled} onChange={() => toggle("push_enabled")} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function NotificationsAdminPage({ superadmin = false }: { superadmin?: boolean }) {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [running, setRunning] = useState("");
  async function load() { setStats(await getNotificationStats()); }
  useEffect(() => { load().catch((error) => toast.error(getErrorMessage(error))); }, []);

  async function run(name: string, action: () => Promise<{ created: number }>) {
    setRunning(name);
    try {
      const data = await action();
      await load();
      toast.success(`${data.created} notificaciones generadas.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRunning("");
    }
  }

  if (!stats) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title={superadmin ? "Notificaciones globales" : "Centro de alertas"} description="Resumen y generadores manuales de recordatorios." actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to="/notifications">Mis notificaciones</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={<Bell className="h-5 w-5" />} />
        <StatCard label="No leidas" value={stats.unread} icon={<Inbox className="h-5 w-5" />} />
        <StatCard label="Leidas" value={stats.read} icon={<CheckCheck className="h-5 w-5" />} />
        <StatCard label="Archivadas" value={stats.archived} icon={<Trash2 className="h-5 w-5" />} />
        <StatCard label="Urgentes" value={stats.urgent} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>
      <Card title="Generadores">
        <div className="flex flex-wrap gap-2">
          <Button isLoading={running === "inventory"} onClick={() => run("inventory", generateInventoryAlerts)}>Inventario</Button>
          <Button isLoading={running === "appointments"} onClick={() => run("appointments", () => generateAppointmentReminders(24))}>Citas proximas</Button>
          <Button isLoading={running === "billing"} onClick={() => run("billing", generateBillingAlerts)}>Facturas pendientes</Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Por modulo"><Table data={stats.by_module} columns={[{ key: "module", header: "Modulo", render: (row) => row.module }, { key: "count", header: "Cantidad", render: (row) => row.count }]} /></Card>
        <Card title="Por tipo"><Table data={stats.by_type} columns={[{ key: "type", header: "Tipo", render: (row) => row.notification_type }, { key: "count", header: "Cantidad", render: (row) => row.count }]} /></Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-medium text-slate-900">{value}</p></div>;
}

function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input className="h-5 w-5 rounded border-slate-300 text-brand-600" type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  );
}
