import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getAppointments, getMyDoctorAppointments } from "../../api/appointmentsApi";
import { getErrorMessage } from "../../api/axios";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { Appointment } from "../../types/appointment";
import { formatDateOnly, formatTime, listPathForRole, roleNameFrom, todayIso } from "./appointmentUtils";

export function ClinicCalendarPage({ doctorOnly = false }: { doctorOnly?: boolean }) {
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [date, setDate] = useState(todayIso());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const filters = { date };
      setAppointments(doctorOnly ? await getMyDoctorAppointments(filters) : await getAppointments(filters));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { document.title = "Calendario | MediCore"; load(); }, []);
  useEffect(() => { load(); }, [date]);

  return (
    <div className="space-y-6">
      <PageHeader title={doctorOnly ? "Mi calendario" : "Calendario de citas"} description={formatDateOnly(date)} actions={<input className="h-10 rounded-md border border-slate-300 px-3 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />} />
      <Card>
        {loading ? <Loader /> : appointments.length ? (
          <div className="divide-y divide-slate-100">
            {appointments.map((appointment) => (
              <Link key={appointment.id} className="grid gap-3 py-4 hover:bg-slate-50 md:grid-cols-[130px_1fr_1fr_130px]" to={`${listPathForRole(roleName)}/${appointment.id}`}>
                <div className="font-semibold text-slate-900">{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</div>
                <div><p className="font-medium text-slate-900">{appointment.patient_name}</p><p className="text-sm text-slate-500">{appointment.reason}</p></div>
                <div><p className="text-slate-700">{appointment.doctor_name}</p><p className="text-sm text-slate-500">{appointment.doctor_specialty}</p></div>
                <div><AppointmentStatusBadge status={appointment.status} /></div>
              </Link>
            ))}
          </div>
        ) : <p className="py-8 text-center text-sm text-slate-500">No hay citas en esta fecha.</p>}
      </Card>
    </div>
  );
}
