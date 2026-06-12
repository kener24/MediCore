import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createClinic, getClinic, updateClinic } from "../../api/clinicsApi";
import { getErrorMessage } from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import type { Clinic, ClinicPayload } from "../../types/clinic";
import { ClinicForm } from "../clinics/ClinicForm";

export function SuperAdminClinicFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(id);

  useEffect(() => {
    document.title = isEditing ? "Editar clinica | Superadmin" : "Nueva clinica | Superadmin";
    async function load() {
      if (!id) return;
      try {
        setClinic(await getClinic(id));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEditing]);

  async function handleSubmit(payload: ClinicPayload) {
    setSaving(true);
    try {
      if (id) {
        await updateClinic(id, payload);
        toast.success("Clinica actualizada correctamente.");
      } else {
        await createClinic(payload);
        toast.success("Clinica creada correctamente.");
      }
      navigate("/superadmin/clinics");
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
        <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Editar clinica" : "Nueva clinica"}</h1>
        <p className="mt-1 text-sm text-slate-500">Gestion global de clinicas de MediCore.</p>
      </div>
      <Card>
        <ClinicForm clinic={clinic} isSubmitting={saving} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
