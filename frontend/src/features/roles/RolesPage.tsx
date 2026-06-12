import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getRoles } from "../../api/rolesApi";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Table } from "../../components/ui/Table";
import type { Role } from "../../types/role";

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Roles | MediCore";
    async function load() {
      try {
        setRoles(await getRoles());
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Roles</h1>
        <p className="mt-1 text-sm text-slate-500">Catálogo de permisos base del sistema.</p>
      </div>
      <Card>
        <Table
          data={roles}
          emptyMessage="No hay roles registrados."
          columns={[
            { key: "name", header: "Nombre", render: (role) => <Badge tone="role">{role.nombre}</Badge> },
            { key: "description", header: "Descripción", render: (role) => role.descripcion || "Sin descripción" },
            { key: "status", header: "Estado", render: (role) => <Badge tone={role.activo ? "active" : "inactive"}>{role.activo ? "Activo" : "Inactivo"}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}
