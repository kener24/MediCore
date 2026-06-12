import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarCheck, Clock } from "lucide-react";
import { toast } from "sonner";

import { getAppointmentAvailability } from "../../api/appointmentsApi";
import { getErrorMessage } from "../../api/axios";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Card } from "../../components/ui/Card";
import type { Appointment, AppointmentPayload } from "../../types/appointment";
import type { DoctorProfile } from "../../types/doctor";
import type { Patient } from "../../types/patient";
import { formatTime, todayIso } from "./appointmentUtils";

interface AppointmentFormProps {
  appointment?: Appointment | null;
  isSubmitting: boolean;
  onSubmit: (payload: AppointmentPayload) => Promise<void>;
}

export function AppointmentForm({ appointment, isSubmitting, onSubmit }: AppointmentFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [payload, setPayload] = useState<AppointmentPayload>({
    patient: appointment?.patient ?? "",
    doctor: appointment?.doctor ?? "",
    scheduled_date: appointment?.scheduled_date ?? todayIso(),
    start_time: appointment?.start_time?.slice(0, 5) ?? "",
    end_time: appointment?.end_time?.slice(0, 5) ?? "",
    reason: appointment?.reason ?? "",
    notes: appointment?.notes ?? "",
  });

  const selectedDoctor = useMemo(() => doctors.find((doctor) => String(doctor.id) === String(payload.doctor)), [doctors, payload.doctor]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [patientData, doctorData] = await Promise.all([getPatients({ is_active: "true" }), getDoctors({ is_active: "true" })]);
        setPatients(patientData);
        setDoctors(doctorData);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
    loadCatalogs();
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      if (!payload.doctor || !payload.scheduled_date) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const availability = await getAppointmentAvailability(payload.doctor, payload.scheduled_date);
        setAvailableSlots(availability.available_slots);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadAvailability();
  }, [payload.doctor, payload.scheduled_date]);

  function update<K extends keyof AppointmentPayload>(key: K, value: AppointmentPayload[K]) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  function pickSlot(slot: { start_time: string; end_time: string }) {
    setPayload((current) => ({ ...current, start_time: formatTime(slot.start_time), end_time: formatTime(slot.end_time) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...payload,
      patient: Number(payload.patient),
      doctor: Number(payload.doctor),
      start_time: payload.start_time,
      end_time: payload.end_time || undefined,
    });
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Paciente
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" required value={payload.patient} onChange={(event) => update("patient", event.target.value)}>
              <option value="">Seleccionar paciente</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombre_completo} - {patient.codigo_paciente}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Medico
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" required value={payload.doctor} onChange={(event) => update("doctor", event.target.value)}>
              <option value="">Seleccionar medico</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user_nombre} - {doctor.specialty_nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Fecha
            <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" min={todayIso()} required type="date" value={payload.scheduled_date} onChange={(event) => update("scheduled_date", event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Inicio
              <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" required type="time" value={payload.start_time} onChange={(event) => update("start_time", event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Fin
              <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" type="time" value={payload.end_time ?? ""} onChange={(event) => update("end_time", event.target.value)} />
            </label>
          </div>
          <label className="space-y-1 text-sm font-medium text-slate-700 lg:col-span-2">
            Motivo
            <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" maxLength={250} required value={payload.reason} onChange={(event) => update("reason", event.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 lg:col-span-2">
            Notas
            <textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={payload.notes ?? ""} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </div>
      </Card>

      <Card title="Disponibilidad" actions={selectedDoctor ? <span className="text-sm text-slate-500">{selectedDoctor.duracion_consulta_minutos} min por consulta</span> : null}>
        {loadingSlots ? <p className="text-sm text-slate-500">Consultando horarios...</p> : availableSlots.length ? (
          <div className="flex flex-wrap gap-2">
            {availableSlots.map((slot) => (
              <button key={`${slot.start_time}-${slot.end_time}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50" type="button" onClick={() => pickSlot(slot)}>
                <Clock className="h-4 w-4" />{formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">Selecciona medico y fecha para ver espacios disponibles.</p>}
      </Card>

      <div className="flex justify-end">
        <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
          <CalendarCheck className="h-4 w-4" />{isSubmitting ? "Guardando..." : "Guardar cita"}
        </button>
      </div>
    </form>
  );
}
