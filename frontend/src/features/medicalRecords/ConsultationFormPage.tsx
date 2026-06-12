import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createConsultation, getConsultation, updateConsultation } from "../../api/medicalRecordsApi";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { ClinicalConsultation, ConsultationPayload } from "../../types/medicalRecord";
import { ConsultationForm } from "./ConsultationForm";
import { consultationListPath, roleNameFrom } from "./medicalRecordUtils";

export function ConsultationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [consultation, setConsultation] = useState<ClinicalConsultation | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try { setConsultation(await getConsultation(id)); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function submit(payload: ConsultationPayload) {
    setSaving(true);
    try {
      if (id) await updateConsultation(id, payload);
      else await createConsultation(payload);
      toast.success("Consulta guardada como borrador.");
      navigate(consultationListPath(roleName));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  return <div className="space-y-6"><PageHeader title={id ? "Editar consulta" : "Nueva consulta"} description="Registro medico base para historial clinico." /><ConsultationForm consultation={consultation} isSubmitting={saving} onSubmit={submit} /></div>;
}
