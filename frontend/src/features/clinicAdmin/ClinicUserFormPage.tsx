import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createClinicUser, getClinicUser, updateClinicUser } from "../../api/clinicAdminApi";
import { getErrorMessage } from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { ClinicAdminUser, ClinicUserCreatePayload, ClinicUserUpdatePayload } from "../../types/clinicAdmin";
import { ClinicUserForm } from "./ClinicUserForm";

export function ClinicUserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<ClinicAdminUser | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(id);

  useEffect(() => {
    document.title = isEditing ? "Editar usuario | Clinica" : "Nuevo usuario | Clinica";
    async function load() {
      if (!id) return;
      try {
        setUser(await getClinicUser(id));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEditing]);

  async function handleSubmit(payload: ClinicUserCreatePayload | ClinicUserUpdatePayload) {
    setSaving(true);
    try {
      if (id) {
        await updateClinicUser(id, payload);
        toast.success("Usuario actualizado correctamente.");
      } else {
        await createClinicUser(payload as ClinicUserCreatePayload);
        toast.success("Usuario creado correctamente.");
      }
      navigate("/clinic/users");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={isEditing ? "Editar usuario" : "Nuevo usuario"}
        description="La clinica se asigna automaticamente segun el admin autenticado."
      />
      <Card>
        <ClinicUserForm user={user} isSubmitting={saving} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
