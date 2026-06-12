import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDoctorDashboard } from "../../api/doctorsApi";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { DoctorDashboard } from "../../types/doctor";
import { ScheduleReadOnly } from "./DoctorDashboardPage";

export function DoctorMySchedulesPage() {
  const [data, setData] = useState<DoctorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setData(await getDoctorDashboard()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, []);
  if (loading) return <Loader />;
  if (!data?.doctor) return <EmptyState title="Aun no tienes perfil medico configurado." />;
  return <div className="space-y-6"><PageHeader title="Mis Horarios" description="Horarios de atencion configurados por la clinica." /><ScheduleReadOnly schedules={data.schedules} /></div>;
}
