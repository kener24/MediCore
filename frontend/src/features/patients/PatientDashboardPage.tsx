import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getMyPatientProfile } from "../../api/patientsApi";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { Patient } from "../../types/patient";
import { PatientDetailsContent } from "./PatientDetailsPage";

export function PatientDashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    async function load() {
      try { setPatient(await getMyPatientProfile()); } catch (error) { setMissing(true); toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, []);
  if (loading) return <Loader />;
  if (missing || !patient) return <EmptyState title="No tienes un perfil de paciente vinculado." description="Contacta a tu clinica para vincular tu usuario." />;
  return <div className="space-y-6"><PageHeader title={`Bienvenido, ${patient.nombres}`} description="Portal del paciente preparado para futuros modulos moviles." /><PatientDetailsContent patient={patient} /></div>;
}
