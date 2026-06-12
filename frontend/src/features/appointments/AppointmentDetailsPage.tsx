import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Pencil, UserCheck, UserX, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { cancelAppointment, confirmAppointment, getAppointment, markAppointmentAttended, markAppointmentNoShow } from "../../api/appointmentsApi";
import { getErrorMessage } from "../../api/axios";
import { startConsultationFromAppointment } from "../../api/medicalRecordsApi";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { Appointment } from "../../types/appointment";
import { formatDateOnly, formatTime, listPathForRole, roleNameFrom } from "./appointmentUtils";

export function AppointmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const canManage = ["admin", "superadmin", "recepcionista", "enfermera"].includes(roleName);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setAppointment(await getAppointment(id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function run(action: () => Promise<Appointment>, success: string) {
    setSaving(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitCancel(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    if (!cancelReason.trim()) return;
    await run(() => cancelAppointment(id, cancelReason.trim()), "Cita cancelada correctamente.");
    setCancelOpen(false);
    setCancelReason("");
  }

  async function startConsultation() {
    if (!id) return;
    setSaving(true);
    try {
      const consultation = await startConsultationFromAppointment(id);
      toast.success("Consulta iniciada correctamente.");
      navigate(`/clinic/consultations/${consultation.id}/edit`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  if (!appointment) return null;
  const mutable = appointment.status !== "atendida" && appointment.status !== "cancelada";
  const activeFlow = ["pendiente", "confirmada", "reprogramada"].includes(appointment.status);
  const canOperate = canManage || roleName === "medico";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalle de cita"
        actions={<Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700" to={listPathForRole(roleName)}><ArrowLeft className="h-4 w-4" />Volver</Link>}
      />
      <Card>
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Paciente</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{appointment.patient_name}</p>
            <p className="text-sm text-slate-500">{appointment.patient_code}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Medico</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{appointment.doctor_name}</p>
            <p className="text-sm text-slate-500">{appointment.doctor_specialty}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Estado</p>
            <div className="mt-2"><AppointmentStatusBadge status={appointment.status} /></div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Fecha y hora</p>
            <p className="mt-1 text-slate-900">{formatDateOnly(appointment.scheduled_date)} | {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase text-slate-500">Motivo</p>
            <p className="mt-1 text-slate-900">{appointment.reason}</p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{appointment.notes || "Sin notas"}</p>
          </div>
          {appointment.cancellation_reason ? <div className="lg:col-span-3"><p className="text-xs font-semibold uppercase text-slate-500">Cancelacion</p><p className="mt-1 text-slate-700">{appointment.cancellation_reason}</p></div> : null}
        </div>
      </Card>
      {canOperate ? (
        <div className="flex flex-wrap justify-end gap-2">
          {canManage && mutable ? <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700" to={`/clinic/appointments/${appointment.id}/edit`}><Pencil className="h-4 w-4" />Editar</Link> : null}
          {canManage && appointment.status === "pendiente" ? <button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white" disabled={saving} onClick={() => run(() => confirmAppointment(appointment.id), "Cita confirmada.")}><CheckCircle2 className="h-4 w-4" />Confirmar</button> : null}
          {roleName === "medico" && activeFlow ? <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" disabled={saving} onClick={startConsultation}>Iniciar consulta</button> : null}
          {canManage && activeFlow ? <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" disabled={saving} onClick={() => run(() => markAppointmentAttended(appointment.id), "Cita atendida.")}><UserCheck className="h-4 w-4" />Atendida</button> : null}
          {canManage && activeFlow ? <button className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white" disabled={saving} onClick={() => run(() => markAppointmentNoShow(appointment.id), "Cita marcada como no asistio.")}><UserX className="h-4 w-4" />No asistio</button> : null}
          {canManage && mutable ? <button className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white" disabled={saving} onClick={() => setCancelOpen(true)}><XCircle className="h-4 w-4" />Cancelar</button> : null}
        </div>
      ) : null}
      <Modal open={cancelOpen} title="Cancelar cita" onClose={() => setCancelOpen(false)} actions={<><ModalCloseButton onClick={() => setCancelOpen(false)} /><button className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white" form="cancel-appointment-detail-form" type="submit">Cancelar cita</button></>}>
        <form id="cancel-appointment-detail-form" className="grid gap-4" onSubmit={submitCancel}>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo de cancelacion</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label>
        </form>
      </Modal>
    </div>
  );
}
