import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, UserMinus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { deactivateUser, getUsers, updateUser } from "../../api/usersApi";
import { getRoles } from "../../api/rolesApi";
import { getClinics } from "../../api/clinicsApi";
import { getErrorMessage } from "../../api/axios";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";
import { formatDate } from "../../utils/formatDate";
import type { Clinic } from "../../types/clinic";
import type { Role } from "../../types/role";
import type { User, UserPayload } from "../../types/user";
import { UserForm } from "./UserForm";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [usersData, rolesData, clinicsData] = await Promise.all([getUsers(), getRoles(), getClinics()]);
      setUsers(usersData);
      setRoles(rolesData);
      setClinics(clinicsData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Usuarios | MediCore";
    load();
  }, []);

  async function handleUpdate(payload: UserPayload) {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await updateUser(selectedUser.id, payload);
      toast.success("Usuario actualizado correctamente.");
      setSelectedUser(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivatingUser) return;
    try {
      await deactivateUser(deactivatingUser.id);
      toast.success("Usuario desactivado.");
      setDeactivatingUser(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">Administración de accesos por rol y clínica.</p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200"
          to="/users/new"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Link>
      </div>
      <Card>
        <Table
          data={users}
          emptyMessage="No hay usuarios registrados."
          columns={[
            { key: "name", header: "Nombre completo", render: (user) => <span className="font-medium text-slate-900">{user.nombre_completo}</span> },
            { key: "email", header: "Email", render: (user) => user.email },
            { key: "phone", header: "Teléfono", render: (user) => user.telefono || "Sin teléfono" },
            { key: "role", header: "Rol", render: (user) => <Badge tone="role">{user.role_nombre ?? "rol"}</Badge> },
            { key: "clinic", header: "Clínica", render: (user) => user.clinica_nombre ?? "Sin clínica" },
            { key: "status", header: "Estado", render: (user) => <Badge tone={user.is_active ? "active" : "inactive"}>{user.is_active ? "Activo" : "Inactivo"}</Badge> },
            { key: "created", header: "Creación", render: (user) => formatDate(user.creado_en ?? user.date_joined) },
            {
              key: "actions",
              header: "Acciones",
              render: (user) => (
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" to={`/users/${user.id}`} title="Ver detalle">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => setSelectedUser(user)} type="button" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {user.is_active ? (
                    <button className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" onClick={() => setDeactivatingUser(user)} type="button" title="Desactivar">
                      <UserMinus className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="Editar usuario"
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        actions={<ModalCloseButton onClick={() => setSelectedUser(null)} />}
      >
        <UserForm roles={roles} clinics={clinics} user={selectedUser} isSubmitting={saving} onSubmit={handleUpdate} />
      </Modal>
      <Modal
        title="Desactivar usuario"
        open={Boolean(deactivatingUser)}
        onClose={() => setDeactivatingUser(null)}
        actions={<><ModalCloseButton onClick={() => setDeactivatingUser(null)} /><Button variant="danger" onClick={handleDeactivate}>Desactivar</Button></>}
      >
        <p className="text-sm text-slate-600">El usuario {deactivatingUser?.nombre_completo} no podra ingresar al sistema hasta que sea activado nuevamente.</p>
      </Modal>
    </div>
  );
}
