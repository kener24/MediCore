import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser } from "../../api/usersApi";
import { getRoles } from "../../api/rolesApi";
import { getClinics } from "../../api/clinicsApi";
import { getErrorMessage } from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import type { Clinic } from "../../types/clinic";
import type { Role } from "../../types/role";
import type { UserPayload } from "../../types/user";
import { UserForm } from "./UserForm";

export function UserCreatePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "Nuevo usuario | MediCore";
    async function load() {
      try {
        const [rolesData, clinicsData] = await Promise.all([getRoles(), getClinics()]);
        setRoles(rolesData);
        setClinics(clinicsData);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(payload: UserPayload) {
    setSaving(true);
    try {
      await createUser(payload);
      toast.success("Usuario creado correctamente.");
      navigate(location.pathname.startsWith("/superadmin") ? "/superadmin/users" : "/users");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo usuario</h1>
        <p className="mt-1 text-sm text-slate-500">Crea un acceso para personal o pacientes.</p>
      </div>
      <Card>
        <UserForm roles={roles} clinics={clinics} isSubmitting={saving} onSubmit={handleCreate} />
      </Card>
    </div>
  );
}
