import { useEffect, useMemo, useState } from "react";
import { Building2, ShieldCheck, UserCheck, Users } from "lucide-react";

import { getClinics } from "../../api/clinicsApi";
import { getRoles } from "../../api/rolesApi";
import { getUsers } from "../../api/usersApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { getErrorMessage } from "../../api/axios";
import type { Clinic } from "../../types/clinic";
import type { Role } from "../../types/role";
import type { User } from "../../types/user";

export function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard | MediCore";
    async function load() {
      try {
        const [usersData, clinicsData, rolesData] = await Promise.allSettled([getUsers(), getClinics(), getRoles()]);
        if (usersData.status === "fulfilled") setUsers(usersData.value);
        if (clinicsData.status === "fulfilled") setClinics(clinicsData.value);
        if (rolesData.status === "fulfilled") setRoles(rolesData.value);
        const rejected = [usersData, clinicsData, rolesData].find((item) => item.status === "rejected");
        setError(rejected && rejected.status === "rejected" ? getErrorMessage(rejected.reason) : null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total usuarios", value: users.length, icon: Users },
      { label: "Total clínicas", value: clinics.length, icon: Building2 },
      { label: "Total roles", value: roles.length, icon: ShieldCheck },
      { label: "Usuarios activos", value: users.filter((user) => user.is_active).length, icon: UserCheck },
    ],
    [clinics.length, roles.length, users]
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Vista general de la base administrativa.</p>
      </div>
      {error ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-brand-50 p-3 text-brand-700">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Actividad inicial">
        <p className="text-sm leading-6 text-slate-600">
          El panel está conectado a los listados base del backend. Las tarjetas se alimentan de usuarios, clínicas y roles cuando el rol autenticado tiene permiso para verlos.
        </p>
      </Card>
    </div>
  );
}
