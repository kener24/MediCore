import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getRoles } from "../../api/rolesApi";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table } from "../../components/ui/Table";
import type { Role } from "../../types/role";

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Roles | MediCore";
    async function load() {
      try {
        const data = await getRoles();
        setRoles(data);
        setActiveRole(data.find((role) => role.nombre === "admin") ?? data[0] ?? null);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const groups = useMemo(() => Object.entries(activeRole?.permission_groups ?? {}), [activeRole]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <PageHeader title="Roles y permisos" description="Capacidades operativas por rol para controlar acceso en web y móvil." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card title="Catálogo de roles">
          <Table
            data={roles}
            emptyMessage="No hay roles registrados."
            columns={[
              { key: "name", header: "Nombre", render: (role) => <button className="text-left" onClick={() => setActiveRole(role)}><Badge tone="role">{role.nombre}</Badge></button> },
              { key: "description", header: "Descripción", render: (role) => role.descripcion || "Permisos base del sistema." },
              { key: "permissions", header: "Capacidades", render: (role) => role.permissions?.length ?? 0 },
              { key: "status", header: "Estado", render: (role) => <Badge tone={role.activo ? "active" : "inactive"}>{role.activo ? "Activo" : "Inactivo"}</Badge> },
            ]}
          />
        </Card>
        <Card title={activeRole ? `Permisos: ${activeRole.nombre}` : "Permisos"}>
          {groups.length ? (
            <div className="space-y-4">
              {groups.map(([group, permissions]) => (
                <section key={group} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-brand-50 p-2 text-brand-700"><ShieldCheck className="h-4 w-4" /></span>
                    <h2 className="font-semibold text-slate-900">{group}</h2>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {permissions.map((permission) => <li key={permission}>• {permission}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">Este rol no tiene capacidades documentadas.</p>}
        </Card>
      </div>
    </div>
  );
}
