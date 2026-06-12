import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Lock, MailCheck, MonitorSmartphone, RotateCcw, Settings, ShieldCheck, Unlock, XCircle } from "lucide-react";

import {
  confirmEmailVerification,
  confirmPasswordReset,
  getAccountLocks,
  getAdminSessions,
  getEmailVerificationStatus,
  getMySecurityActivity,
  getMySessions,
  getPasswordPolicy,
  getSecuritySettings,
  requestPasswordReset,
  revokeAdminSession,
  revokeAllSessions,
  revokeSession,
  sendEmailVerification,
  unlockAccountLock,
  updateSecuritySettings,
} from "../../api/securityApi";
import { changePassword } from "../../api/authApi";
import { getErrorMessage } from "../../api/axios";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { AccountLock, PasswordPolicy, SecurityActivity, SecuritySettings, UserSession } from "../../types/security";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isAdminRole(role?: string) {
  return role === "admin" || role === "superadmin";
}

function PolicyChecklist({ policy, password }: { policy?: PasswordPolicy; password: string }) {
  if (!policy) return null;
  const items = [
    { label: `Minimo ${policy.min_length} caracteres`, ok: password.length >= policy.min_length },
    { label: "Incluye mayuscula", ok: !policy.require_uppercase || /[A-Z]/.test(password) },
    { label: "Incluye minuscula", ok: !policy.require_lowercase || /[a-z]/.test(password) },
    { label: "Incluye numero", ok: !policy.require_number || /\d/.test(password) },
    { label: "Incluye simbolo", ok: !policy.require_symbol || /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className={item.ok ? "flex items-center gap-2 text-emerald-700" : "flex items-center gap-2 text-slate-500"}>
          {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Recuperar contrasena | MediCore";
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await requestPasswordReset(email);
      setMessage(response.detail);
      setDebugUrl(response.reset_url ?? "");
      toast.success("Solicitud enviada.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-soft">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3 text-brand-700">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperar contrasena</h1>
          <p className="mt-2 text-sm text-slate-500">Te enviaremos instrucciones si el correo existe en MediCore.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Button className="w-full" type="submit" isLoading={loading}>Enviar instrucciones</Button>
          {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          {debugUrl ? <Link className="block text-sm font-semibold text-brand-700 hover:underline" to={new URL(debugUrl).pathname + new URL(debugUrl).search}>Abrir enlace de prueba</Link> : null}
          <Link className="block text-center text-sm font-semibold text-slate-600 hover:text-brand-700" to="/login">Volver al login</Link>
        </form>
      </section>
    </main>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<PasswordPolicy>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const token = params.get("token") ?? "";

  useEffect(() => {
    document.title = "Restablecer contrasena | MediCore";
    getPasswordPolicy().then(setPolicy).catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await confirmPasswordReset({ token, new_password: newPassword, confirm_password: confirmPassword });
      toast.success("Contrasena actualizada. Inicia sesion nuevamente.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Restablecer contrasena</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="Nueva contrasena" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <Input label="Confirmar contrasena" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <PolicyChecklist policy={policy} password={newPassword} />
          <Button className="w-full" type="submit" isLoading={loading} disabled={!token}>Actualizar contrasena</Button>
        </form>
      </section>
    </main>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    document.title = "Verificar correo | MediCore";
    const token = params.get("token") ?? "";
    if (!token) {
      setStatus("error");
      return;
    }
    confirmEmailVerification(token).then(() => setStatus("success")).catch(() => setStatus("error"));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 text-center shadow-soft">
        {status === "loading" ? <Loader label="Validando correo..." /> : null}
        {status === "success" ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /> : null}
        {status === "error" ? <XCircle className="mx-auto h-12 w-12 text-rose-600" /> : null}
        {status !== "loading" ? <h1 className="mt-4 text-xl font-bold text-slate-900">{status === "success" ? "Correo verificado" : "No se pudo verificar"}</h1> : null}
        {status !== "loading" ? <Link className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:underline" to="/login">Ir al login</Link> : null}
      </section>
    </main>
  );
}

export function SecurityCenterPage() {
  const { user } = useAuth();
  const role = user?.role_nombre ?? (typeof user?.role === "object" ? user.role.nombre : "");
  const cards = [
    { title: "Mis sesiones", path: "/security/sessions", icon: MonitorSmartphone, text: "Revisa dispositivos activos y cierra accesos." },
    { title: "Cambiar contrasena", path: "/security/password", icon: KeyRound, text: "Aplica la politica vigente de seguridad." },
    { title: "Verificacion de correo", path: "/security/email", icon: MailCheck, text: "Confirma tu correo principal de acceso." },
    { title: "Actividad", path: "/security/activity", icon: ShieldCheck, text: "Consulta eventos recientes de seguridad." },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Seguridad" description="Centro de control de acceso, sesiones y credenciales." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.path} to={card.path} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-md">
              <Icon className="h-7 w-7 text-brand-700" />
              <h2 className="mt-4 font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.text}</p>
            </Link>
          );
        })}
      </div>
      {isAdminRole(role) ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-brand-200" to="/security/admin/account-locks">Bloqueos de cuenta</Link>
          <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-brand-200" to="/security/admin/sessions">Sesiones administrativas</Link>
          <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-brand-200" to="/security/settings">Politicas de seguridad</Link>
        </div>
      ) : null}
    </div>
  );
}

function SessionsTable({ sessions, onRevoke, admin = false }: { sessions: UserSession[]; onRevoke: (id: number) => void; admin?: boolean }) {
  if (!sessions.length) return <EmptyState title="Sin sesiones" description="No hay sesiones para mostrar." />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            {admin ? <th className="px-4 py-3">Usuario</th> : null}
            <th className="px-4 py-3">Dispositivo</th>
            <th className="px-4 py-3">IP</th>
            <th className="px-4 py-3">Ultima actividad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <tr key={session.id}>
              {admin ? <td className="px-4 py-3 font-medium text-slate-800">{session.user_nombre || session.user_email}</td> : null}
              <td className="px-4 py-3">{session.device_name || "Dispositivo"}</td>
              <td className="px-4 py-3">{session.ip_address ?? "-"}</td>
              <td className="px-4 py-3">{formatDate(session.last_activity_at)}</td>
              <td className="px-4 py-3">
                <Badge tone={session.active ? "active" : "inactive"}>{session.current ? "Actual" : session.active ? "Activa" : "Cerrada"}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="outline" icon={<Lock className="h-4 w-4" />} disabled={!session.active || session.current} onClick={() => onRevoke(session.id)}>Cerrar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => getMySessions().then(setSessions).finally(() => setLoading(false));
  useEffect(() => {
    document.title = "Mis sesiones | MediCore";
    load();
  }, []);
  async function closeSession(id: number) {
    await revokeSession(id);
    toast.success("Sesion cerrada.");
    load();
  }
  async function closeAll() {
    await revokeAllSessions(true);
    toast.success("Sesiones cerradas.");
    load();
  }
  if (loading) return <Loader label="Cargando sesiones..." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Mis sesiones" description="Dispositivos con acceso vigente." actions={<Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={closeAll}>Cerrar otras sesiones</Button>} />
      <Card><SessionsTable sessions={sessions} onRevoke={closeSession} /></Card>
    </div>
  );
}

export function EmailVerificationPage() {
  const [status, setStatus] = useState<{ email: string; email_verified: boolean }>();
  const [debugUrl, setDebugUrl] = useState("");
  useEffect(() => {
    document.title = "Verificacion de correo | MediCore";
    getEmailVerificationStatus().then(setStatus);
  }, []);
  async function send() {
    const response = await sendEmailVerification();
    setDebugUrl(response.verification_url ?? "");
    toast.success(response.detail);
  }
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Verificacion de correo" description="Estado del correo principal de tu cuenta." />
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Correo</p>
            <p className="mt-1 font-semibold text-slate-900">{status?.email ?? "-"}</p>
            <div className="mt-3"><Badge tone={status?.email_verified ? "active" : "inactive"}>{status?.email_verified ? "Verificado" : "Pendiente"}</Badge></div>
          </div>
          <Button icon={<MailCheck className="h-4 w-4" />} onClick={send} disabled={status?.email_verified}>Reenviar</Button>
        </div>
        {debugUrl ? <Link className="mt-4 block text-sm font-semibold text-brand-700 hover:underline" to={new URL(debugUrl).pathname + new URL(debugUrl).search}>Abrir enlace de prueba</Link> : null}
      </Card>
    </div>
  );
}

export function PasswordSecurityPage() {
  const [policy, setPolicy] = useState<PasswordPolicy>();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    document.title = "Contrasena | MediCore";
    getPasswordPolicy().then(setPolicy);
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("La confirmacion no coincide.");
      return;
    }
    setLoading(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      toast.success("Contrasena actualizada.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Contrasena" description="Actualiza tu credencial de acceso." />
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <Input label="Contrasena actual" type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required />
          <Input label="Nueva contrasena" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <Input label="Confirmar nueva contrasena" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <PolicyChecklist policy={policy} password={newPassword} />
          <Button type="submit" isLoading={loading}>Actualizar contrasena</Button>
        </form>
      </Card>
    </div>
  );
}

export function AccountLocksAdminPage() {
  const [locks, setLocks] = useState<AccountLock[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => getAccountLocks({ active: true }).then(setLocks).finally(() => setLoading(false));
  useEffect(() => {
    document.title = "Bloqueos | MediCore";
    load();
  }, []);
  async function unlock(id: number) {
    await unlockAccountLock(id);
    toast.success("Cuenta desbloqueada.");
    load();
  }
  if (loading) return <Loader label="Cargando bloqueos..." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Bloqueos de cuenta" description="Usuarios bloqueados por seguridad." />
      <Card>
        {!locks.length ? <EmptyState title="Sin bloqueos activos" description="No hay cuentas bloqueadas." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-100">
                {locks.map((lock) => (
                  <tr key={lock.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{lock.user_nombre || lock.user_email}</td>
                    <td className="px-4 py-3">{lock.clinic_nombre || "-"}</td>
                    <td className="px-4 py-3">{lock.failed_attempts} intentos</td>
                    <td className="px-4 py-3">{formatDate(lock.locked_until)}</td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" icon={<Unlock className="h-4 w-4" />} onClick={() => unlock(lock.id)}>Desbloquear</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminSessionsPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => getAdminSessions({ active: true }).then(setSessions).finally(() => setLoading(false));
  useEffect(() => {
    document.title = "Sesiones admin | MediCore";
    load();
  }, []);
  async function closeSession(id: number) {
    await revokeAdminSession(id);
    toast.success("Sesion revocada.");
    load();
  }
  if (loading) return <Loader label="Cargando sesiones..." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Sesiones administrativas" description="Sesiones activas visibles segun permisos." />
      <Card><SessionsTable sessions={sessions} onRevoke={closeSession} admin /></Card>
    </div>
  );
}

export function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    document.title = "Politicas de seguridad | MediCore";
    getSecuritySettings().then(setSettings);
  }, []);
  const numberFields = useMemo(() => [
    ["password_min_length", "Longitud minima"],
    ["max_failed_login_attempts", "Intentos maximos"],
    ["lockout_minutes", "Minutos de bloqueo"],
    ["password_reset_token_minutes", "Minutos token reset"],
    ["email_verification_token_minutes", "Minutos token correo"],
    ["session_lifetime_minutes", "Minutos de sesion"],
  ] as const, []);
  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSecuritySettings(settings);
      setSettings(updated);
      toast.success("Configuracion actualizada.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  if (!settings) return <Loader label="Cargando configuracion..." />;
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Politicas de seguridad" description="Reglas de contrasena, bloqueo y sesiones." actions={<Button icon={<Settings className="h-4 w-4" />} isLoading={saving} onClick={save}>Guardar</Button>} />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {numberFields.map(([field, label]) => (
            <Input key={field} label={label} type="number" value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: Number(event.target.value) })} />
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["password_require_uppercase", "Requerir mayuscula"],
            ["password_require_lowercase", "Requerir minuscula"],
            ["password_require_number", "Requerir numero"],
            ["password_require_symbol", "Requerir simbolo"],
            ["require_email_verification", "Requerir verificacion de correo"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={Boolean(settings[field as keyof SecuritySettings])} onChange={(event) => setSettings({ ...settings, [field]: event.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function SecurityActivityPage() {
  const [activity, setActivity] = useState<SecurityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    document.title = "Actividad de seguridad | MediCore";
    getMySecurityActivity().then(setActivity).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader label="Cargando actividad..." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Actividad de seguridad" description="Eventos recientes asociados a tu cuenta." />
      <Card>
        {!activity.length ? <EmptyState title="Sin actividad" description="Todavia no hay eventos de seguridad." /> : (
          <div className="divide-y divide-slate-100">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{item.description || item.action}</p>
                  <p className="text-sm text-slate-500">{item.module} - {item.ip_address ?? "sin IP"}</p>
                </div>
                <span className="text-sm text-slate-500">{formatDate(item.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
