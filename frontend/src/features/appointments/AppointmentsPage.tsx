import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, CheckCircle2, Eye, Pencil, Search, UserCheck, UserX, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { cancelAppointment, confirmAppointment, getAppointments, getMyDoctorAppointments, getMyPatientAppointments, markAppointmentAttended, markAppointmentNoShow } from "../../api/appointmentsApi";
import { getErrorMessage } from "../../api/axios";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import type { Appointment, AppointmentFilters } from "../../types/appointment";
import type { DoctorProfile } from "../../types/doctor";
import type { Patient } from "../../types/patient";
import { appointmentStatusOptions, formatDateOnly, formatTime, listPathForRole, roleNameFrom, todayIso } from "./appointmentUtils";

type Mode = "clinic" | "doctor" | "patient" | "superadmin";

export function AppointmentsPage({ mode = "clinic" }: { mode?: Mode }) {
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [doctor, setDoctor] = useState("");
  const [patient, setPatient] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const canManage = ["admin", "superadmin", "recepcionista", "enfermera"].includes(roleName);
  const canCreate = canManage || roleName === "medico" || roleName === "paciente";

  async function load() {
    setLoading(true);
    try {
      const filters: AppointmentFilters = { date: date || undefined, status: status || undefined, doctor: doctor || undefined, patient: patient || undefined, search: search || undefined };
      if (mode === "doctor") setAppointments(await getMyDoctorAppointments(filters));
      else if (mode === "patient") setAppointments(await getMyPatientAppointments(filters));
      else setAppointments(await getAppointments(filters));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Citas | MediCore";
    load();
  }, []);

  useEffect(() => {
    async function loadFilters() {
      if (!canManage && mode !== "superadmin") return;
      try {
        const [doctorData, patientData] = await Promise.all([getDoctors({ is_active: "true" }), getPatients({ is_active: "true" })]);
        setDoctors(doctorData);
        setPatients(patientData);
      } catch {
        setDoctors([]);
        setPatients([]);
      }
    }
    loadFilters();
  }, [canManage, mode]);

  async function runAction(id: number, action: () => Promise<Appointment>, success: string) {
    setSavingId(id);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  }

  function openCancel(id: number) {
    setCancellingId(id);
    setCancelReason("");
  }

  async function submitCancel(event: FormEvent) {
    event.preventDefault();
    if (!cancellingId || !cancelReason.trim()) return;
    await runAction(cancellingId, () => cancelAppointment(cancellingId, cancelReason.trim()), "Cita cancelada correctamente.");
    setCancellingId(null);
    setCancelReason("");
  }

  const title = mode === "doctor" ? "Mis citas" : mode === "patient" ? "Mis citas medicas" : mode === "superadmin" ? "Citas globales" : "Citas";
  const newPath = roleName === "paciente" ? "/patient/appointments/new" : "/clinic/appointments/new";
  const detailBase = listPathForRole(roleName);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Agenda, estados y acciones de seguimiento."
        actions={canCreate ? <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to={newPath}><CalendarPlus className="h-4 w-4" />Nueva cita</Link> : null}
      />
      <Card>
        <div className="mb-4 grid gap-3 xl:grid-cols-[160px_170px_190px_190px_1fr_auto]">
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <SelectFilter value={status} onChange={(event) => setStatus(event.target.value)} options={appointmentStatusOptions} />
          <SelectFilter value={doctor} onChange={(event) => setDoctor(event.target.value)} options={[{ label: "Medico", value: "" }, ...doctors.map((item) => ({ label: item.user_nombre ?? `Medico ${item.id}`, value: String(item.id) }))]} />
          <SelectFilter value={patient} onChange={(event) => setPatient(event.target.value)} options={[{ label: "Paciente", value: "" }, ...patients.map((item) => ({ label: item.nombre_completo, value: String(item.id) }))]} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" placeholder="Buscar motivo, paciente o medico" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="h-10 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-700" onClick={load}>Filtrar</button>
        </div>
        {loading ? <Loader /> : appointments.length ? (
          <Table data={appointments} columns={[
            { key: "fecha", header: "Fecha", render: (item) => <div><p className="font-medium text-slate-900">{formatDateOnly(item.scheduled_date)}</p><p className="text-xs text-slate-500">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p></div> },
            { key: "paciente", header: "Paciente", render: (item) => <div><p>{item.patient_name}</p><p className="text-xs text-slate-500">{item.patient_code}</p></div> },
            { key: "medico", header: "Medico", render: (item) => <div><p>{item.doctor_name}</p><p className="text-xs text-slate-500">{item.doctor_specialty}</p></div> },
            { key: "motivo", header: "Motivo", render: (item) => item.reason },
            { key: "estado", header: "Estado", render: (item) => <AppointmentStatusBadge status={item.status} /> },
            { key: "acciones", header: "Acciones", render: (item) => (
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-md border p-2" to={`${detailBase}/${item.id}`} title="Ver"><Eye className="h-4 w-4" /></Link>
                {canManage && item.status !== "atendida" && item.status !== "cancelada" ? <Link className="rounded-md border p-2" to={`/clinic/appointments/${item.id}/edit`} title="Editar"><Pencil className="h-4 w-4" /></Link> : null}
                {canManage && item.status === "pendiente" ? <button className="rounded-md border p-2 text-emerald-700" disabled={savingId === item.id} onClick={() => runAction(item.id, () => confirmAppointment(item.id), "Cita confirmada.")} title="Confirmar"><CheckCircle2 className="h-4 w-4" /></button> : null}
                {canManage && ["pendiente", "confirmada", "reprogramada"].includes(item.status) ? <button className="rounded-md border p-2 text-brand-700" disabled={savingId === item.id} onClick={() => runAction(item.id, () => markAppointmentAttended(item.id), "Cita marcada como atendida.")} title="Atendida"><UserCheck className="h-4 w-4" /></button> : null}
                {canManage && ["pendiente", "confirmada", "reprogramada"].includes(item.status) ? <button className="rounded-md border p-2 text-amber-700" disabled={savingId === item.id} onClick={() => runAction(item.id, () => markAppointmentNoShow(item.id), "Cita marcada como no asistio.")} title="No asistio"><UserX className="h-4 w-4" /></button> : null}
                {canManage && item.status !== "atendida" && item.status !== "cancelada" ? <button className="rounded-md border p-2 text-rose-700" disabled={savingId === item.id} onClick={() => openCancel(item.id)} title="Cancelar"><XCircle className="h-4 w-4" /></button> : null}
              </div>
            ) },
          ]} />
        ) : <EmptyState title="No hay citas para mostrar." description="Ajusta los filtros o registra una nueva cita." />}
      </Card>
      <div className="flex justify-end">
        <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => { setDate(todayIso()); setStatus(""); setDoctor(""); setPatient(""); setSearch(""); }}>Ver hoy</button>
      </div>
      <Modal open={Boolean(cancellingId)} title="Cancelar cita" onClose={() => setCancellingId(null)} actions={<><ModalCloseButton onClick={() => setCancellingId(null)} /><button className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white" form="cancel-appointment-form" type="submit">Cancelar cita</button></>}>
        <form id="cancel-appointment-form" className="grid gap-4" onSubmit={submitCancel}>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo de cancelacion</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label>
        </form>
      </Modal>
    </div>
  );
}
