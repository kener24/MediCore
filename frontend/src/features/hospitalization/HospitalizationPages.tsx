import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bed, ClipboardList, DoorOpen, HeartPulse, NotebookPen, Users } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import {
  assignHospitalBed,
  cancelHospitalization,
  changeHospitalBed,
  createHospitalBed,
  createHospitalRoom,
  createHospitalVitalSigns,
  createHospitalization,
  createNursingNote,
  dischargeHospitalization,
  getAvailableHospitalBeds,
  getHospitalBeds,
  getHospitalRooms,
  getHospitalization,
  getHospitalizationDashboard,
  getHospitalizations,
} from "../../api/hospitalizationApi";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { DoctorProfile } from "../../types/doctor";
import type { HospitalBed, HospitalRoom, Hospitalization } from "../../types/hospitalization";
import type { Patient } from "../../types/patient";
import { cleanDecimal, onlyDigits } from "../../utils/inputSanitizers";

const statusLabel: Record<string, string> = {
  active: "Activo",
  observation: "Observación",
  transferred: "Trasladado",
  discharged: "Alta",
  cancelled: "Cancelado",
};

const bedStatusLabel: Record<string, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  blocked: "Bloqueada",
};

function StatusPill({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{statusLabel[value] || bedStatusLabel[value] || value}</span>;
}

export function HospitalizationDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getHospitalizationDashboard>> | null>(null);
  const [admissions, setAdmissions] = useState<Hospitalization[]>([]);
  useEffect(() => {
    Promise.all([getHospitalizationDashboard(), getHospitalizations({ active: "true" })])
      .then(([dashboard, active]) => { setStats(dashboard); setAdmissions(active); })
      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);
  if (!stats) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title="Hospitalización" description="Pacientes internados, camas y seguimiento básico de enfermería." actions={<Link className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to="/clinic/hospitalization/new">Nuevo internamiento</Link>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Internados" value={stats.active_patients} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Observación" value={stats.observation_patients} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="Camas disponibles" value={stats.available_beds} icon={<Bed className="h-5 w-5" />} />
        <StatCard label="Notas urgentes" value={stats.urgent_notes} icon={<NotebookPen className="h-5 w-5" />} />
      </div>
      <HospitalizationTable admissions={admissions} />
    </div>
  );
}

function HospitalizationTable({ admissions }: { admissions: Hospitalization[] }) {
  return (
    <Card title="Pacientes internados">
      {admissions.length ? (
        <Table data={admissions} columns={[
          { key: "patient", header: "Paciente", render: (row) => row.patient_name },
          { key: "bed", header: "Cama", render: (row) => row.current_bed_code || "Sin cama" },
          { key: "doctor", header: "Médico", render: (row) => row.responsible_doctor_name || "-" },
          { key: "status", header: "Estado", render: (row) => <StatusPill value={row.status} /> },
          { key: "date", header: "Ingreso", render: (row) => new Date(row.admission_datetime).toLocaleString("es-HN") },
          { key: "actions", header: "Acciones", render: (row) => <Link className="rounded-md border px-3 py-1 text-xs font-semibold" to={`/clinic/hospitalization/admissions/${row.id}`}>Ver</Link> },
        ]} />
      ) : <EmptyState title="No hay pacientes internados." description="Los internamientos activos aparecerán aquí." />}
    </Card>
  );
}

export function HospitalizedPatientsPage() {
  const [admissions, setAdmissions] = useState<Hospitalization[]>([]);
  useEffect(() => { getHospitalizations({ active: "true" }).then(setAdmissions).catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Pacientes internados" description="Control actual de pacientes hospitalizados." /><HospitalizationTable admissions={admissions} /></div>;
}

export function HospitalizationFormPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [form, setForm] = useState({ patient: "", responsible_doctor: "", bed: "", admission_source: "reception", status: "active", reason: "", diagnosis_at_admission: "" });
  useEffect(() => {
    Promise.all([getPatients({ is_active: "true" }), getDoctors({ is_active: "true" }), getAvailableHospitalBeds()])
      .then(([p, d, b]) => { setPatients(p); setDoctors(d); setBeds(b); })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await createHospitalization({
        patient: Number(form.patient),
        responsible_doctor: form.responsible_doctor ? Number(form.responsible_doctor) : null,
        bed: form.bed ? Number(form.bed) : null,
        admission_source: form.admission_source,
        status: form.status,
        reason: form.reason,
        diagnosis_at_admission: form.diagnosis_at_admission,
      });
      toast.success("Internamiento creado correctamente.");
      navigate(`/clinic/hospitalization/admissions/${created.id}`);
    } catch (error) { toast.error(getErrorMessage(error)); }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo internamiento" description="Asigna paciente, médico responsable y cama si aplica." />
      <Card>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-11 rounded-md border px-3 text-sm" required value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}><option value="">Paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo} | {p.identidad || p.codigo_paciente}</option>)}</select>
            <select className="h-11 rounded-md border px-3 text-sm" value={form.responsible_doctor} onChange={(e) => setForm({ ...form, responsible_doctor: e.target.value })}><option value="">Médico responsable</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.user_nombre}</option>)}</select>
            <select className="h-11 rounded-md border px-3 text-sm" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })}><option value="">Sin cama asignada</option>{beds.map((b) => <option key={b.id} value={b.id}>{b.bed_code} · {b.room_name}</option>)}</select>
            <select className="h-11 rounded-md border px-3 text-sm" value={form.admission_source} onChange={(e) => setForm({ ...form, admission_source: e.target.value })}><option value="reception">Recepción</option><option value="consultation">Consulta</option><option value="emergency">Emergencia</option><option value="transfer">Traslado</option><option value="other">Otro</option></select>
          </div>
          <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" required placeholder="Motivo de internamiento" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Diagnóstico al ingreso" value={form.diagnosis_at_admission} onChange={(e) => setForm({ ...form, diagnosis_at_admission: e.target.value })} />
          <Button type="submit">Crear internamiento</Button>
        </form>
      </Card>
    </div>
  );
}

export function HospitalizationDetailPage() {
  const { id } = useParams();
  const [admission, setAdmission] = useState<Hospitalization | null>(null);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  async function load() {
    if (!id) return;
    const [detail, availableBeds] = await Promise.all([getHospitalization(id), getAvailableHospitalBeds()]);
    setAdmission(detail);
    setBeds(availableBeds);
  }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!admission) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title={admission.patient_name} description={`Internamiento ${statusLabel[admission.status] || admission.status}`} actions={<Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold" to="/clinic/hospitalization/admissions">Volver</Link>} />
      <Card title="Datos del internamiento">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p><b>Cama:</b> {admission.current_bed_code || "Sin cama"}</p>
          <p><b>Médico:</b> {admission.responsible_doctor_name || "-"}</p>
          <p><b>Ingreso:</b> {new Date(admission.admission_datetime).toLocaleString("es-HN")}</p>
          <p className="md:col-span-3"><b>Motivo:</b> {admission.reason}</p>
          <p className="md:col-span-3"><b>Diagnóstico:</b> {admission.diagnosis_at_admission || "-"}</p>
        </div>
      </Card>
      {admission.status !== "discharged" && admission.status !== "cancelled" ? <HospitalizationActions admission={admission} beds={beds} onSaved={load} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <VitalSignsSection admission={admission} onSaved={load} />
        <NursingNotesSection admission={admission} onSaved={load} />
      </div>
    </div>
  );
}

function HospitalizationActions({ admission, beds, onSaved }: { admission: Hospitalization; beds: HospitalBed[]; onSaved: () => Promise<void> }) {
  const [bed, setBed] = useState("");
  const [notes, setNotes] = useState("");
  async function moveBed() {
    if (!bed) return toast.error("Selecciona una cama disponible.");
    try {
      if (admission.current_bed) await changeHospitalBed(admission.id, { bed: Number(bed), notes });
      else await assignHospitalBed(admission.id, { bed: Number(bed), notes });
      toast.success("Cama actualizada correctamente.");
      setBed(""); setNotes(""); await onSaved();
    } catch (e) { toast.error(getErrorMessage(e)); }
  }
  async function discharge() {
    const reason = window.prompt("Motivo de alta hospitalaria") || "";
    try { await dischargeHospitalization(admission.id, { discharge_reason: reason, bed_status: "cleaning" }); toast.success("Alta hospitalaria registrada."); await onSaved(); } catch (e) { toast.error(getErrorMessage(e)); }
  }
  async function cancel() {
    const reason = window.prompt("Motivo de cancelación") || "";
    if (!reason) return;
    try { await cancelHospitalization(admission.id, { reason }); toast.success("Internamiento cancelado."); await onSaved(); } catch (e) { toast.error(getErrorMessage(e)); }
  }
  return <Card title="Acciones"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"><select className="h-10 rounded-md border px-3 text-sm" value={bed} onChange={(e) => setBed(e.target.value)}><option value="">Cama disponible</option>{beds.map((b) => <option key={b.id} value={b.id}>{b.bed_code} · {b.room_name}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" placeholder="Notas de traslado" value={notes} onChange={(e) => setNotes(e.target.value)} /><Button type="button" onClick={moveBed}>{admission.current_bed ? "Cambiar cama" : "Asignar cama"}</Button><Button type="button" variant="outline" onClick={discharge}>Alta</Button><Button type="button" variant="danger" onClick={cancel}>Cancelar</Button></div></Card>;
}

function VitalSignsSection({ admission, onSaved }: { admission: Hospitalization; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<Record<string, string>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await createHospitalVitalSigns(admission.id, Object.fromEntries(Object.entries(form).filter(([, value]) => value !== "")));
      toast.success("Signos vitales registrados correctamente.");
      setForm({}); await onSaved();
    } catch (error) { toast.error(getErrorMessage(error)); }
  }
  const fields = ["temperature", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "respiratory_rate", "oxygen_saturation", "weight", "height", "glucose", "pain_scale"];
  return <Card title="Signos vitales hospitalarios"><form className="grid gap-2 md:grid-cols-2" onSubmit={submit}>{fields.map((field) => <input key={field} className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder={field} value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: field.includes("pressure") || field.includes("rate") || field.includes("saturation") || field === "glucose" || field === "pain_scale" ? onlyDigits(e.target.value) : cleanDecimal(e.target.value, 2) })} />)}<input className="h-10 rounded-md border px-3 text-sm md:col-span-2" placeholder="Notas" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><Button type="submit">Guardar signos</Button></form><div className="mt-4 space-y-2">{admission.recent_vital_signs?.length ? admission.recent_vital_signs.map((s) => <p key={s.id} className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">{new Date(s.recorded_at).toLocaleString("es-HN")} · PA {s.blood_pressure_systolic || "-"}/{s.blood_pressure_diastolic || "-"} · Temp {s.temperature || "-"} · SpO2 {s.oxygen_saturation || "-"}</p>) : <EmptyState title="Sin signos hospitalarios." />}</div></Card>;
}

function NursingNotesSection({ admission, onSaved }: { admission: Hospitalization; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ note_type: "normal", title: "", note: "" });
  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await createNursingNote(admission.id, form); toast.success("Nota de enfermería registrada correctamente."); setForm({ note_type: "normal", title: "", note: "" }); await onSaved(); } catch (error) { toast.error(getErrorMessage(error)); }
  }
  return <Card title="Notas de enfermería"><form className="grid gap-2" onSubmit={submit}><select className="h-10 rounded-md border px-3 text-sm" value={form.note_type} onChange={(e) => setForm({ ...form, note_type: e.target.value })}><option value="normal">Normal</option><option value="important">Importante</option><option value="urgent">Urgente</option><option value="medication">Medicamento</option><option value="observation">Observación</option><option value="incident">Incidente</option></select><input className="h-10 rounded-md border px-3 text-sm" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" required placeholder="Nota clínica de enfermería" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /><Button type="submit">Agregar nota</Button></form><div className="mt-4 space-y-2">{admission.recent_nursing_notes?.length ? admission.recent_nursing_notes.map((n) => <p key={n.id} className="rounded-md bg-slate-50 p-2 text-xs text-slate-600"><b>{n.title || n.note_type}</b> · {n.note}</p>) : <EmptyState title="Sin notas de enfermería." />}</div></Card>;
}

export function HospitalRoomsBedsPage() {
  const [rooms, setRooms] = useState<HospitalRoom[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [roomForm, setRoomForm] = useState({ name: "", room_number: "", floor: "", room_type: "general" });
  const [bedForm, setBedForm] = useState({ room: "", bed_number: "", status: "available", notes: "" });
  async function load() { const [r, b] = await Promise.all([getHospitalRooms(), getHospitalBeds()]); setRooms(r); setBeds(b); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function saveRoom(e: FormEvent) { e.preventDefault(); try { await createHospitalRoom(roomForm); toast.success("Habitación creada."); setRoomForm({ name: "", room_number: "", floor: "", room_type: "general" }); await load(); } catch (error) { toast.error(getErrorMessage(error)); } }
  async function saveBed(e: FormEvent) { e.preventDefault(); try { await createHospitalBed({ ...bedForm, room: Number(bedForm.room) }); toast.success("Cama creada."); setBedForm({ room: "", bed_number: "", status: "available", notes: "" }); await load(); } catch (error) { toast.error(getErrorMessage(error)); } }
  return <div className="space-y-6"><PageHeader title="Habitaciones y camas" description="Gestión operativa de camas hospitalarias." /><div className="grid gap-4 lg:grid-cols-2"><Card title="Nueva habitación"><form className="grid gap-3" onSubmit={saveRoom}><input className="h-10 rounded-md border px-3 text-sm" required placeholder="Nombre" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" required placeholder="Número" value={roomForm.room_number} onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Piso" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} /><Button type="submit">Crear habitación</Button></form></Card><Card title="Nueva cama"><form className="grid gap-3" onSubmit={saveBed}><select className="h-10 rounded-md border px-3 text-sm" required value={bedForm.room} onChange={(e) => setBedForm({ ...bedForm, room: e.target.value })}><option value="">Habitación</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.room_number} · {r.name}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" required placeholder="Número de cama" value={bedForm.bed_number} onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={bedForm.status} onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}><option value="available">Disponible</option><option value="cleaning">Limpieza</option><option value="maintenance">Mantenimiento</option><option value="blocked">Bloqueada</option></select><Button type="submit">Crear cama</Button></form></Card></div><Card title="Camas"><Table data={beds} columns={[{ key: "code", header: "Cama", render: (b) => b.bed_code }, { key: "room", header: "Habitación", render: (b) => b.room_name || "-" }, { key: "status", header: "Estado", render: (b) => <StatusPill value={b.status} /> }, { key: "patient", header: "Paciente", render: (b) => b.current_patient || "-" }]} /></Card></div>;
}
