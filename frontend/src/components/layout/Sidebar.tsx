import { BarChart3, Bell, Building2, CalendarClock, ChevronDown, FileText, Gauge, KeyRound, LogOut, Menu, Package, ScrollText, ShieldCheck, Stethoscope, UserCircle, Users, Wallet, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";

import { useAuth } from "../../hooks/useAuth";
import { canManageCatalogs } from "../../utils/constants";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon?: typeof Gauge;
}

interface NavGroup {
  label: string;
  icon: typeof Gauge;
  path?: string;
  items?: NavItem[];
}

const accountGroup: NavGroup = {
  label: "Cuenta",
  icon: UserCircle,
  items: [
    { label: "Perfil", path: "/profile", icon: UserCircle },
    { label: "Seguridad", path: "/security", icon: ShieldCheck },
    { label: "Sesiones", path: "/security/sessions", icon: ShieldCheck },
    { label: "Notificaciones", path: "/notifications", icon: Bell },
    { label: "Preferencias", path: "/notifications/preferences", icon: KeyRound },
    { label: "Cambiar contrasena", path: "/change-password", icon: KeyRound },
  ],
};

const adminGroups: NavGroup[] = [
  { label: "Dashboard", path: "/clinic/dashboard", icon: Gauge },
  {
    label: "Administracion",
    icon: Building2,
    items: [
      { label: "Mi Clinica", path: "/clinic/my-clinic" },
      { label: "Configuracion", path: "/clinic/settings" },
      { label: "Seguridad", path: "/security/settings" },
      { label: "Bloqueos", path: "/security/admin/account-locks" },
      { label: "Suscripcion", path: "/clinic/subscription" },
      { label: "Usuarios", path: "/clinic/users" },
      { label: "Medicos", path: "/clinic/doctors" },
      { label: "Especialidades", path: "/clinic/specialties" },
    ],
  },
  {
    label: "Operacion clinica",
    icon: CalendarClock,
    items: [
      { label: "Pacientes", path: "/clinic/patients" },
      { label: "Admisiones", path: "/clinic/admissions" },
      { label: "Nueva atencion", path: "/clinic/admissions/new" },
      { label: "Triaje", path: "/clinic/triage" },
      { label: "Citas", path: "/clinic/appointments" },
      { label: "Calendario", path: "/clinic/calendar" },
    ],
  },
  {
    label: "Expediente",
    icon: FileText,
    items: [
      { label: "Expedientes", path: "/clinic/medical-records" },
      { label: "Consultas", path: "/clinic/consultations" },
      { label: "Recetas", path: "/clinic/prescriptions" },
      { label: "Ordenes", path: "/clinic/medical-orders" },
      { label: "Documentos", path: "/clinic/documents" },
      { label: "Categorias doc.", path: "/clinic/documents/categories" },
    ],
  },
  {
    label: "Facturacion",
    icon: Wallet,
    items: [
      { label: "Resumen", path: "/clinic/billing" },
      { label: "Pendientes de cobro", path: "/clinic/billing/pending" },
      { label: "Facturas", path: "/clinic/billing/invoices" },
      { label: "Pagos", path: "/clinic/billing/payments" },
      { label: "Caja", path: "/clinic/billing/cash" },
      { label: "Servicios", path: "/clinic/billing/services" },
    ],
  },
  {
    label: "Inventario",
    icon: Package,
    items: [
      { label: "Resumen", path: "/clinic/inventory" },
      { label: "Productos", path: "/clinic/inventory/items" },
      { label: "Categorias", path: "/clinic/inventory/categories" },
      { label: "Lotes", path: "/clinic/inventory/lots" },
      { label: "Movimientos", path: "/clinic/inventory/movements" },
      { label: "Alertas", path: "/clinic/inventory/alerts" },
    ],
  },
  {
    label: "Compras",
    icon: Package,
    items: [
      { label: "Resumen", path: "/clinic/purchases" },
      { label: "Proveedores", path: "/clinic/purchases/suppliers" },
      { label: "Ordenes de compra", path: "/clinic/purchases/orders" },
      { label: "Recepciones", path: "/clinic/purchases/receipts" },
    ],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    items: [
      { label: "Dashboard Clinica", path: "/clinic/reports/dashboard" },
      { label: "Reportes", path: "/clinic/reports" },
      { label: "Finanzas", path: "/clinic/reports/financial" },
      { label: "Inventario", path: "/clinic/reports/inventory" },
      { label: "Compras", path: "/clinic/reports/purchases" },
    ],
  },
  {
    label: "Auditoria",
    icon: ScrollText,
    items: [
      { label: "Resumen", path: "/clinic/audit" },
      { label: "Bitacora", path: "/clinic/audit/logs" },
      { label: "Alertas", path: "/clinic/notifications/admin" },
    ],
  },
  accountGroup,
];

const doctorGroups: NavGroup[] = [
  { label: "Dashboard", path: "/doctor/dashboard", icon: Gauge },
  {
    label: "Agenda",
    icon: CalendarClock,
    items: [
      { label: "Mis Citas", path: "/doctor/appointments" },
      { label: "Mi Calendario", path: "/doctor/calendar" },
      { label: "Mis Horarios", path: "/doctor/schedules" },
    ],
  },
  {
    label: "Atencion clinica",
    icon: Stethoscope,
    items: [
      { label: "Mi Perfil Medico", path: "/doctor/profile" },
      { label: "Sala de espera", path: "/doctor/waiting-room" },
      { label: "Pacientes", path: "/clinic/patients" },
      { label: "Expedientes", path: "/clinic/medical-records" },
      { label: "Mis Consultas", path: "/doctor/consultations" },
      { label: "Documentos clinicos", path: "/doctor/documents" },
    ],
  },
  {
    label: "Indicaciones",
    icon: FileText,
    items: [
      { label: "Diagnosticos", path: "/doctor/diagnoses" },
      { label: "Recetas", path: "/doctor/prescriptions" },
      { label: "Ordenes", path: "/doctor/medical-orders" },
      { label: "Medicamentos", path: "/doctor/inventory/items" },
    ],
  },
  {
    label: "Analitica",
    icon: BarChart3,
    items: [
      { label: "Mis Reportes", path: "/doctor/reports" },
    ],
  },
  accountGroup,
];

const nurseGroups: NavGroup[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  {
    label: "Clinica",
    icon: CalendarClock,
    items: [
      { label: "Pacientes", path: "/clinic/patients" },
      { label: "Triaje", path: "/clinic/triage" },
      { label: "Citas", path: "/clinic/appointments" },
      { label: "Calendario", path: "/clinic/calendar" },
    ],
  },
  {
    label: "Expediente",
    icon: FileText,
    items: [
      { label: "Expedientes", path: "/clinic/medical-records" },
      { label: "Consultas", path: "/clinic/consultations" },
      { label: "Ordenes", path: "/clinic/medical-orders" },
      { label: "Documentos", path: "/clinic/documents" },
    ],
  },
  {
    label: "Inventario",
    icon: Package,
    items: [
      { label: "Resumen", path: "/clinic/inventory" },
      { label: "Productos", path: "/clinic/inventory/items" },
      { label: "Movimientos", path: "/clinic/inventory/movements" },
    ],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    items: [
      { label: "Dashboard Clinica", path: "/clinic/reports/dashboard" },
      { label: "Citas", path: "/clinic/reports/appointments" },
      { label: "Inventario", path: "/clinic/reports/inventory" },
    ],
  },
  accountGroup,
];

const receptionistGroups: NavGroup[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  {
    label: "Recepcion",
    icon: CalendarClock,
    items: [
      { label: "Pacientes", path: "/clinic/patients" },
      { label: "Admisiones", path: "/clinic/admissions" },
      { label: "Nueva atencion", path: "/clinic/admissions/new" },
      { label: "Citas", path: "/clinic/appointments" },
      { label: "Calendario", path: "/clinic/calendar" },
      { label: "Documentos", path: "/clinic/documents" },
    ],
  },
  {
    label: "Facturacion",
    icon: Wallet,
    items: [
      { label: "Resumen", path: "/clinic/billing" },
      { label: "Pendientes de cobro", path: "/clinic/billing/pending" },
      { label: "Facturas", path: "/clinic/billing/invoices" },
      { label: "Pagos", path: "/clinic/billing/payments" },
      { label: "Caja", path: "/clinic/billing/cash" },
    ],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    items: [
      { label: "Dashboard Recepcion", path: "/clinic/reception-dashboard" },
      { label: "Citas", path: "/clinic/reports/appointments" },
      { label: "Caja", path: "/clinic/reports/cash" },
    ],
  },
  accountGroup,
];

const patientGroups: NavGroup[] = [
  { label: "Mi Portal", path: "/patient/dashboard", icon: Gauge },
  {
    label: "Mi salud",
    icon: FileText,
    items: [
      { label: "Mi Perfil de Paciente", path: "/patient/profile" },
      { label: "Mis Citas", path: "/patient/appointments" },
      { label: "Solicitar cita", path: "/patient/appointments/request" },
      { label: "Mi Expediente", path: "/patient/medical-record" },
      { label: "Mis Documentos", path: "/patient/documents" },
      { label: "Mis Recetas", path: "/patient/prescriptions" },
      { label: "Mis Ordenes", path: "/patient/medical-orders" },
    ],
  },
  {
    label: "Pagos",
    icon: Wallet,
    items: [
      { label: "Mis Facturas", path: "/patient/invoices" },
      { label: "Mis Pagos", path: "/patient/payments" },
      { label: "Clinica", path: "/patient/clinic-info" },
    ],
  },
  accountGroup,
];

const superAdminGroups: NavGroup[] = [
  { label: "Dashboard Global", path: "/superadmin/dashboard", icon: Gauge },
  {
    label: "SaaS",
    icon: ShieldCheck,
    items: [
      { label: "Clinicas", path: "/superadmin/clinics" },
      { label: "Usuarios", path: "/superadmin/users" },
      { label: "Roles", path: "/roles" },
      { label: "Pacientes globales", path: "/superadmin/patients" },
      { label: "Citas globales", path: "/superadmin/appointments" },
      { label: "Reportes globales", path: "/superadmin/reports" },
      { label: "Bitacora global", path: "/superadmin/audit" },
      { label: "Notificaciones", path: "/superadmin/notifications" },
      { label: "Config. clinicas", path: "/superadmin/clinic-settings" },
      { label: "Planes SaaS", path: "/superadmin/subscriptions/plans" },
      { label: "Suscripciones", path: "/superadmin/subscriptions/clinics" },
      { label: "Seguridad", path: "/security/settings" },
      { label: "Bloqueos", path: "/security/admin/account-locks" },
      { label: "Sesiones", path: "/security/admin/sessions" },
    ],
  },
  accountGroup,
];

const baseGroups: NavGroup[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  accountGroup,
];

function navGroupsForRole(roleName: string) {
  if (roleName === "superadmin") return superAdminGroups;
  if (roleName === "paciente") return patientGroups;
  if (roleName === "medico") return doctorGroups;
  if (roleName === "enfermera") return nurseGroups;
  if (roleName === "recepcionista") return receptionistGroups;
  if (canManageCatalogs(roleName)) return adminGroups;
  return baseGroups;
}

function isGroupActive(group: NavGroup, pathname: string) {
  if (group.path && pathname === group.path) return true;
  if (group.label === "SaaS" && pathname === "/superadmin/dashboard") return true;
  return group.items?.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)) ?? false;
}

function SidebarLink({ item, onClose, compact = false }: { item: NavItem; onClose: () => void; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-md text-sm font-medium transition",
          compact ? "px-3 py-2 text-slate-300" : "px-3 py-2.5 text-slate-200",
          isActive ? "bg-brand-600 text-white" : "hover:bg-white/10 hover:text-white"
        )
      }
    >
      {Icon ? <Icon className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarGroup({ group, pathname, onClose }: { group: NavGroup; pathname: string; onClose: () => void }) {
  const Icon = group.icon;
  const active = isGroupActive(group, pathname);

  if (group.path) {
    return <SidebarLink item={{ label: group.label, path: group.path, icon: group.icon }} onClose={onClose} />;
  }

  return (
    <details className="group rounded-md" open={active}>
      <summary
        className={clsx(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition marker:hidden",
          active ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          <span className="truncate">{group.label}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
      </summary>
      <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
        {group.items?.map((item) => <SidebarLink key={item.path} item={item} onClose={onClose} compact />)}
      </div>
    </details>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const roleName = user?.role_nombre ?? (typeof user?.role === "object" ? user.role.nombre : "");
  const groups = navGroupsForRole(roleName);

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 rounded-md bg-white p-2 text-slate-700 shadow md:hidden"
        onClick={onClose}
        type="button"
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 flex h-dvh w-72 flex-col bg-ink-900 text-white transition-transform duration-200 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="shrink-0 border-b border-white/10 px-6 py-5">
          <p className="text-xl font-bold tracking-wide">MediCore</p>
          <p className="mt-1 text-sm text-brand-100">Administracion medica</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <SidebarGroup key={group.label} group={group} pathname={pathname} onClose={onClose} />
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={logout}
            type="button"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesion
          </button>
        </div>
      </aside>
      {open ? <div className="fixed inset-0 z-20 bg-slate-950/40 md:hidden" onClick={onClose} /> : null}
    </>
  );
}
