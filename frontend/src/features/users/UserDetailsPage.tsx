import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getUser } from "../../api/usersApi";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { formatDate } from "../../utils/formatDate";
import type { User } from "../../types/user";

export function UserDetailsPage() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Detalle de usuario | MediCore";
    async function load() {
      if (!id) return;
      try {
        setUser(await getUser(id));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (!user) return <Card>No se encontró el usuario.</Card>;

  const fields = [
    ["Nombre completo", user.nombre_completo],
    ["Email", user.email],
    ["Teléfono", user.telefono || "Sin teléfono"],
    ["Rol", user.role_nombre ?? "Sin rol"],
    ["Clínica", user.clinica_nombre ?? "Sin clínica"],
    ["Último acceso", formatDate(user.ultimo_acceso)],
    ["Fecha de creación", formatDate(user.creado_en ?? user.date_joined)],
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{user.nombre_completo}</h1>
        <p className="mt-1 text-sm text-slate-500">Detalle del usuario.</p>
      </div>
      <Card>
        <div className="mb-5">
          <Badge tone={user.is_active ? "active" : "inactive"}>{user.is_active ? "Activo" : "Inactivo"}</Badge>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
