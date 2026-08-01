import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { activateClinicUser, deactivateClinicUser, getClinicUsersPage } from "../../api/clinicAdminApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { RoleBadge } from "../../components/ui/RoleBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { ClinicAdminUser } from "../../types/clinicAdmin";
import { formatDate } from "../../utils/formatDate";

const roleOptions = [
  { label: "Todos los roles", value: "" },
  { label: "Admin", value: "admin" },
  { label: "Medico", value: "medico" },
  { label: "Enfermera", value: "enfermera" },
  { label: "Recepcionista", value: "recepcionista" },
  { label: "Paciente", value: "paciente" },
];

export function ClinicUsersPage() {
  const [users, setUsers] = useState<ClinicAdminUser[]>([]);
  const [confirmUser, setConfirmUser] = useState<ClinicAdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  async function load(targetPage = page) {
    if (search.trim().length === 1) {
      toast.error("Escribe al menos dos caracteres para buscar.");
      return;
    }
    setLoading(true);
    try {
      const result = await getClinicUsersPage({
          search: search || undefined,
          role: roleFilter || undefined,
          is_active: statusFilter || undefined,
          page: targetPage,
          page_size: 25,
        });
      setUsers(result.results);
      setPage(targetPage);
      setTotal(result.count);
      setHasNext(Boolean(result.next));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Usuarios de clinica | MediCore";
    load();
  }, []);

  async function toggleUser() {
    if (!confirmUser) return;
    if (reason.trim().length < 5) {
      toast.error("Escribe un motivo de al menos 5 caracteres.");
      return;
    }
    setSaving(true);
    try {
      if (confirmUser.is_active) {
        await deactivateClinicUser(confirmUser.id, reason.trim());
        toast.success("Usuario desactivado correctamente.");
      } else {
        await activateClinicUser(confirmUser.id, reason.trim());
        toast.success("Usuario activado correctamente.");
      }
      setConfirmUser(null);
      setReason("");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios de clinica"
        description="Gestiona el personal y pacientes de tu clinica."
        actions={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
            to="/clinic/users/new"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Link>
        }
      />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_190px_170px_auto]">
          <SearchInput placeholder="Buscar por nombre o correo" value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectFilter options={roleOptions} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} />
          <SelectFilter
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { label: "Todos", value: "" },
              { label: "Activos", value: "true" },
              { label: "Inactivos", value: "false" },
            ]}
          />
          <Button type="button" variant="secondary" onClick={() => void load(1)}>
            Filtrar
          </Button>
        </div>
        {loading ? (
          <Loader />
        ) : users.length ? (
          <Table
            data={users}
            columns={[
              { key: "nombre", header: "Nombre completo", render: (user) => <span className="font-medium text-slate-900">{user.nombre_completo}</span> },
              { key: "email", header: "Email", render: (user) => user.email },
              { key: "telefono", header: "Telefono", render: (user) => user.telefono || "Sin telefono" },
              { key: "role", header: "Rol", render: (user) => <RoleBadge role={user.role_nombre} /> },
              { key: "estado", header: "Estado", render: (user) => <StatusBadge active={user.is_active} /> },
              { key: "fecha", header: "Creacion", render: (user) => formatDate(user.creado_en ?? user.date_joined) },
              {
                key: "acciones",
                header: "Acciones",
                render: (user) => (
                  <div className="flex gap-2">
                    <Link className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" to={`/clinic/users/${user.id}/edit`} title="Editar">
                      <Pencil className="h-4 w-4" />
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
          <EmptyState title="No hay usuarios para mostrar." description="Crea usuarios internos o ajusta los filtros." />
        )}
        {!loading && total > 25 ? (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-600">Página {page} · {total} usuarios</span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} type="button" variant="secondary" onClick={() => void load(page - 1)}>Anterior</Button>
              <Button disabled={!hasNext} type="button" variant="secondary" onClick={() => void load(page + 1)}>Siguiente</Button>
            </div>
          </div>
        ) : null}
      </Card>
      <ConfirmModal
        open={Boolean(confirmUser)}
        title={confirmUser?.is_active ? "Desactivar usuario" : "Activar usuario"}
        description={`Confirma esta accion para ${confirmUser?.nombre_completo ?? "el usuario seleccionado"}.`}
        confirmLabel={confirmUser?.is_active ? "Desactivar" : "Activar"}
        tone={confirmUser?.is_active ? "danger" : "primary"}
        isLoading={saving}
        onClose={() => { setConfirmUser(null); setReason(""); }}
        onConfirm={toggleUser}
      >
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Motivo</span>
          <textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" maxLength={300} onChange={(event) => setReason(event.target.value)} value={reason} />
        </label>
      </ConfirmModal>
    </div>
  );
}
