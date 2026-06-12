import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createPatient, getPatient, updatePatient } from "../../api/patientsApi";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { Patient, PatientPayload } from "../../types/patient";
import { PatientForm } from "./PatientForm";

export function PatientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(id);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try { setPatient(await getPatient(id)); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function submit(payload: PatientPayload) {
    setSaving(true);
    try {
      if (id) {
        await updatePatient(id, payload);
        toast.success("Paciente actualizado correctamente.");
      } else {
        await createPatient(payload);
        toast.success("Paciente creado correctamente.");
      }
      navigate("/clinic/patients");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  return <div className="space-y-6"><PageHeader title={isEditing ? "Editar paciente" : "Nuevo paciente"} description="Datos preparados para futuras apps moviles, citas y expediente." /><PatientForm patient={patient} isSubmitting={saving} onSubmit={submit} /></div>;
}
