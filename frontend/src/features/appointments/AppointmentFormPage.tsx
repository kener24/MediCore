import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createAppointment, getAppointment, updateAppointment } from "../../api/appointmentsApi";
import { getErrorMessage } from "../../api/axios";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { Appointment, AppointmentPayload } from "../../types/appointment";
import { listPathForRole, roleNameFrom } from "./appointmentUtils";
import { AppointmentForm } from "./AppointmentForm";

export function AppointmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setAppointment(await getAppointment(id));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function submit(payload: AppointmentPayload) {
    setSaving(true);
    try {
      if (id) {
        await updateAppointment(id, payload);
        toast.success("Cita actualizada correctamente.");
      } else {
        await createAppointment(payload);
        toast.success("Cita creada correctamente.");
      }
      navigate(listPathForRole(roleName));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title={id ? "Editar cita" : "Nueva cita"} description="Selecciona paciente, medico, fecha y horario disponible." />
      <AppointmentForm appointment={appointment} isSubmitting={saving} onSubmit={submit} />
    </div>
  );
}
