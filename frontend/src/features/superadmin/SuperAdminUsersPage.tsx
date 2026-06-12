import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { activateUser, deactivateUser, getUsers } from "../../api/usersApi";
import { getClinics } from "../../api/clinicsApi";
import { getRoles } from "../../api/rolesApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { RoleBadge } from "../../components/ui/RoleBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { Clinic } from "../../types/clinic";
import type { Role } from "../../types/role";
import type { User } from "../../types/user";
import { formatDate } from "../../utils/formatDate";

export function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCatalogs() {
    const [clinicsData, rolesData] = await Promise.all([getClinics(), getRoles()]);
    setClinics(clinicsData);
    setRoles(rolesData);
  }

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(
        await getUsers({
          search: search || undefined,
          clinic: clinicFilter || undefined,
          role: roleFilter || undefined,
          is_active: statusFilter || undefined,
        })
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Usuarios | Superadmin";
    loadCatalogs().catch((error) => toast.error(getErrorMessage(error)));
    loadUsers();
  }, []);

  async function toggleUser() {
    if (!confirmUser) return;
    setSaving(true);
    try {
      if (confirmUser.is_active) {
        await deactivateUser(confirmUser.id);
        toast.success("Usuario desactivado correctamente.");
      } else {
        await activateUser(confirmUser.id);
        toast.success("Usuario activado correctamente.");
      }
      setConfirmUser(null);
      await loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios globales</h1>
          <p className="mt-1 text-sm text-slate-500">Usuarios de todas las clinicas y roles.</p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          to="/superadmin/users/new"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Link>
      </div>
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_190px_180px_170px_auto]">
          <SearchInput placeholder="Buscar por nombre o email" value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectFilter
            value={clinicFilter}
            onChange={(event) => setClinicFilter(event.target.value)}
            options={[{ label: "Todas las clinicas", value: "" }, ...clinics.map((clinic) => ({ label: clinic.nombre, value: String(clinic.id) }))]}
          />
          <SelectFilter
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            options={[{ label: "Todos los roles", value: "" }, ...roles.map((role) => ({ label: role.nombre, value: role.nombre }))]}
          />
          <SelectFilter
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { label: "Todos", value: "" },
              { label: "Activos", value: "true" },
              { label: "Inactivos", value: "false" },
            ]}
          />
          <Button type="button" variant="secondary" onClick={loadUsers}>
            Filtrar
          </Button>
        </div>
        {loading ? (
          <Loader />
        ) : users.length ? (
          <Table
            data={users}
            columns={[
              { key: "nombre", header: "Nombre", render: (user) => <span className="font-medium text-slate-900">{user.nombre_completo}</span> },
              { key: "email", header: "Email", render: (user) => user.email },
              { key: "telefono", header: "Telefono", render: (user) => user.telefono || "Sin telefono" },
              { key: "role", header: "Rol", render: (user) => <RoleBadge role={user.role_nombre} /> },
              { key: "clinica", header: "Clinica", render: (user) => user.clinica_nombre ?? "Sin clinica" },
              { key: "estado", header: "Estado", render: (user) => <StatusBadge active={user.is_active} /> },
              { key: "creado", header: "Creacion", render: (user) => formatDate(user.creado_en ?? user.date_joined) },
              {
                key: "actions",
                header: "Acciones",
                render: (user) => (
                  <div className="flex gap-2">
                    <Link className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" to={`/users/${user.id}`} title="Ver detalle">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => setConfirmUser(user)}
                      type="button"
                      title={user.is_active ? "Desactivar" : "Activar"}
                    >
                      {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="No hay usuarios para mostrar." description="Ajusta los filtros o crea un nuevo usuario." />
        )}
      </Card>
      <ConfirmModal
        open={Boolean(confirmUser)}
        title={confirmUser?.is_active ? "Desactivar usuario" : "Activar usuario"}
        description={`Confirma esta accion para ${confirmUser?.nombre_completo ?? "el usuario seleccionado"}.`}
        confirmLabel={confirmUser?.is_active ? "Desactivar" : "Activar"}
        tone={confirmUser?.is_active ? "danger" : "primary"}
        isLoading={saving}
        onClose={() => setConfirmUser(null)}
        onConfirm={toggleUser}
      />
    </div>
  );
}
