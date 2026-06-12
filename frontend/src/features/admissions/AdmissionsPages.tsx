import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { completeTriage, createVisitVitalSigns, generateInvoiceFromVisit, getAdmissionStatsToday, getDoctorWaitingRoom, getPendingBillingVisits, getTriageQueue, getVisit, getVisitVitalSigns, getVisits, registerWalkIn, startTriage, startVisitConsultation } from "../../api/admissionsApi";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { AdmissionStats, PatientVisit } from "../../types/admission";
import type { DoctorProfile } from "../../types/doctor";
import type { VitalSigns, VitalSignsPayload } from "../../types/medicalRecord";
import type { Patient } from "../../types/patient";
import { DollarSign } from "lucide-react";

const statusLabel: Record<string, string> = {
  registered: "Registrado",
  waiting_triage: "Espera triaje",
  in_triage: "En triaje",
  waiting_doctor: "Espera doctor",
  in_consultation: "En consulta",
  waiting_billing: "Pendiente cobro",
  completed: "Completado",
  cancelled: "Cancelado",
};

function VisitBadge({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{statusLabel[value] || value}</span>;
}

function VisitTable({ visits, actions }: { visits: PatientVisit[]; actions?: (visit: PatientVisit) => ReactNode }) {
  return visits.length ? <Table data={visits} columns={[
    { key: "arrival", header: "Llegada", render: (v) => new Date(v.arrival_time).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }) },
    { key: "patient", header: "Paciente", render: (v) => v.patient_nombre },
    { key: "reason", header: "Motivo", render: (v) => v.reason },
    { key: "priority", header: "Prioridad", render: (v) => v.priority },
    { key: "doctor", header: "Medico", render: (v) => v.assigned_doctor_nombre || "-" },
    { key: "status", header: "Estado", render: (v) => <VisitBadge value={v.status} /> },
    { key: "actions", header: "Acciones", render: (v) => actions ? actions(v) : <Link className="rounded-md border px-3 py-1 text-xs font-semibold" to={`/clinic/admissions/visits/${v.id}`}>Ver</Link> },
  ]} /> : <EmptyState title="No hay pacientes en esta cola." description="Cuando recepcion registre atenciones apareceran aqui." />;
}

export function AdmissionsDashboardPage() {
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  useEffect(() => { Promise.all([getAdmissionStatsToday(), getVisits({ today: "true" })]).then(([s, v]) => { setStats(s); setVisits(v); }).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!stats) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Admisiones" description="Atenciones del dia y flujo operativo." actions={<Link className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to="/clinic/admissions/new">Nueva atencion</Link>} /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Registrados hoy" value={stats.registered_today} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Espera triaje" value={stats.waiting_triage} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Espera doctor" value={stats.waiting_doctor} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Pendiente cobro" value={stats.waiting_billing} icon={<DollarSign className="h-5 w-5" />} /></div><Card title="Pacientes de hoy"><VisitTable visits={visits} /></Card></div>;
}

export function NewWalkInVisitPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [patient, setPatient] = useState("");
  const [patientData, setPatientData] = useState({ nombres: "", apellidos: "", identidad: "", fecha_nacimiento: "", genero: "no_especificado", telefono: "", direccion: "" });
  const [visit, setVisit] = useState({ reason: "", symptoms: "", visit_type: "walk_in", priority: "normal", assigned_doctor: "", notes: "" });
  const navigate = useNavigate();
  useEffect(() => { Promise.all([getPatients({ is_active: "true" }), getDoctors({ is_active: "true" })]).then(([p, d]) => { setPatients(p); setDoctors(d); }).catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await registerWalkIn({ patient: mode === "existing" ? Number(patient) : null, patient_data: mode === "new" ? patientData : undefined, visit: { ...visit, assigned_doctor: visit.assigned_doctor ? Number(visit.assigned_doctor) : null } });
      toast.success("Atencion registrada correctamente.");
      navigate(`/clinic/admissions/visits/${created.id}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }
  return <div className="space-y-6"><PageHeader title="Nueva atencion" description="Registro rapido para pacientes con o sin cita." /><Card><form className="grid gap-4" onSubmit={submit}><div className="flex gap-2"><Button type="button" variant={mode === "existing" ? "primary" : "outline"} onClick={() => setMode("existing")}>Paciente existente</Button><Button type="button" variant={mode === "new" ? "primary" : "outline"} onClick={() => setMode("new")}>Paciente nuevo</Button></div>{mode === "existing" ? <select className="h-11 rounded-md border px-3 text-sm" required value={patient} onChange={(e) => setPatient(e.target.value)}><option value="">Selecciona paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo} | {p.identidad || p.telefono}</option>)}</select> : <div className="grid gap-3 md:grid-cols-3"><input className="h-11 rounded-md border px-3 text-sm" placeholder="Nombres" required value={patientData.nombres} onChange={(e) => setPatientData({ ...patientData, nombres: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" placeholder="Apellidos" required value={patientData.apellidos} onChange={(e) => setPatientData({ ...patientData, apellidos: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" placeholder="Identidad" value={patientData.identidad} onChange={(e) => setPatientData({ ...patientData, identidad: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" type="date" value={patientData.fecha_nacimiento} onChange={(e) => setPatientData({ ...patientData, fecha_nacimiento: e.target.value })} /><select className="h-11 rounded-md border px-3 text-sm" value={patientData.genero} onChange={(e) => setPatientData({ ...patientData, genero: e.target.value })}><option value="no_especificado">No especificado</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option></select><input className="h-11 rounded-md border px-3 text-sm" placeholder="Telefono" value={patientData.telefono} onChange={(e) => setPatientData({ ...patientData, telefono: e.target.value })} /></div>}<div className="grid gap-3 md:grid-cols-2"><input className="h-11 rounded-md border px-3 text-sm" placeholder="Motivo de visita" required value={visit.reason} onChange={(e) => setVisit({ ...visit, reason: e.target.value })} /><select className="h-11 rounded-md border px-3 text-sm" value={visit.priority} onChange={(e) => setVisit({ ...visit, priority: e.target.value })}><option value="normal">Normal</option><option value="priority">Prioritario</option><option value="urgent">Urgente</option><option value="emergency">Emergencia</option></select><select className="h-11 rounded-md border px-3 text-sm" value={visit.assigned_doctor} onChange={(e) => setVisit({ ...visit, assigned_doctor: e.target.value })}><option value="">Medico sin asignar</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.user_nombre}</option>)}</select><input className="h-11 rounded-md border px-3 text-sm" placeholder="Sintomas iniciales" value={visit.symptoms} onChange={(e) => setVisit({ ...visit, symptoms: e.target.value })} /></div><Button type="submit">Registrar atencion</Button></form></Card></div>;
}

export function AdmissionVisitDetailsPage() {
  const { id } = useParams();
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [signs, setSigns] = useState<VitalSigns[]>([]);
  useEffect(() => { if (id) Promise.all([getVisit(id), getVisitVitalSigns(id)]).then(([v, s]) => { setVisit(v); setSigns(s); }).catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!visit) return <Loader />;
  return <div className="space-y-6"><PageHeader title={`Atencion ${visit.visit_number}`} description={visit.patient_nombre || ""} actions={<Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold" to="/clinic/admissions">Volver</Link>} /><Card><div className="grid gap-3 text-sm md:grid-cols-3"><p><b>Estado:</b> {statusLabel[visit.status]}</p><p><b>Prioridad:</b> {visit.priority}</p><p><b>Motivo:</b> {visit.reason}</p><p><b>Sintomas:</b> {visit.symptoms || "-"}</p><p><b>Medico:</b> {visit.assigned_doctor_nombre || "-"}</p><p><b>Enfermera:</b> {visit.assigned_nurse_nombre || "-"}</p></div></Card><Card title="Signos vitales">{signs.length ? <Table data={signs} columns={[{ key: "date", header: "Fecha", render: (s) => s.recorded_at?.slice(0, 16).replace("T", " ") }, { key: "bp", header: "Presion", render: (s) => `${s.blood_pressure_systolic || "-"} / ${s.blood_pressure_diastolic || "-"}` }, { key: "temp", header: "Temp.", render: (s) => s.temperature || "-" }, { key: "ox", header: "Oxigeno", render: (s) => s.oxygen_saturation || "-" }, { key: "bmi", header: "IMC", render: (s) => s.bmi || "-" }]} /> : <EmptyState title="Sin signos vitales." description="La evaluacion de enfermeria aparecera aqui." />}</Card></div>;
}

function VitalSignsMiniForm({ visit, onSaved }: { visit: PatientVisit; onSaved: () => void }) {
  const [form, setForm] = useState<VitalSignsPayload & { pain_scale?: number }>({});
  async function submit(e: FormEvent) { e.preventDefault(); try { await createVisitVitalSigns(visit.id, form); toast.success("Signos vitales registrados."); onSaved(); } catch (err) { toast.error(getErrorMessage(err)); } }
  return <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>{["blood_pressure_systolic", "blood_pressure_diastolic", "temperature", "heart_rate", "respiratory_rate", "oxygen_saturation", "weight", "height", "glucose", "pain_scale"].map((key) => <input key={key} className="h-10 rounded-md border px-3 text-sm" placeholder={key} type="number" value={(form as Record<string, string | number | undefined>)[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}<input className="h-10 rounded-md border px-3 text-sm md:col-span-2" placeholder="Observaciones" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><Button type="submit">Guardar signos</Button></form>;
}

export function TriageQueuePage() {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [selected, setSelected] = useState<PatientVisit | null>(null);
  async function load() { setVisits(await getTriageQueue()); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Triaje" description="Evaluacion inicial y signos vitales." /><Card title="Cola de triaje"><VisitTable visits={visits} actions={(v) => <div className="flex flex-wrap gap-2">{v.status === "waiting_triage" ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={async () => { await startTriage(v.id); await load(); }}>Iniciar</Button> : null}<Button className="h-8 px-3 text-xs" variant="outline" onClick={() => setSelected(v)}>Signos</Button><Button className="h-8 px-3 text-xs" onClick={async () => { await completeTriage(v.id); toast.success("Paciente enviado a doctor."); await load(); }}>Enviar a doctor</Button></div>} /></Card><Modal open={Boolean(selected)} title={`Signos vitales ${selected?.patient_nombre ?? ""}`} onClose={() => setSelected(null)} actions={<ModalCloseButton onClick={() => setSelected(null)} />}>{selected ? <VitalSignsMiniForm visit={selected} onSaved={async () => { setSelected(null); await load(); }} /> : null}</Modal></div>;
}

export function DoctorWaitingRoomPage() {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const navigate = useNavigate();
  useEffect(() => { getDoctorWaitingRoom().then(setVisits).catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function start(visit: PatientVisit) { const data = await startVisitConsultation(visit.id); toast.success("Consulta iniciada."); navigate(`/clinic/consultations/${data.consultation}`); }
  return <div className="space-y-6"><PageHeader title="Sala de espera" description="Pacientes listos para consulta medica." /><Card><VisitTable visits={visits} actions={(v) => <div className="flex flex-wrap gap-2"><Link className="rounded-md border px-3 py-1 text-xs font-semibold" to={`/clinic/admissions/visits/${v.id}`}>Ver</Link><Button className="h-8 px-3 text-xs" onClick={() => start(v)}>Iniciar consulta</Button></div>} /></Card></div>;
}

export function PendingBillingVisitsPage() {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const navigate = useNavigate();
  async function load() { setVisits(await getPendingBillingVisits()); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function generate(visit: PatientVisit) { const invoice = await generateInvoiceFromVisit(visit.id); toast.success("Factura generada desde visita."); navigate(`/clinic/billing/invoices/${invoice.id}`); }
  return <div className="space-y-6"><PageHeader title="Pendientes de cobro" description="Pacientes enviados a caja desde consulta." /><Card><VisitTable visits={visits} actions={(v) => <div className="flex flex-wrap gap-2"><Link className="rounded-md border px-3 py-1 text-xs font-semibold" to={`/clinic/admissions/visits/${v.id}`}>Ver</Link><Button className="h-8 px-3 text-xs" onClick={() => generate(v)}>Generar factura</Button></div>} /></Card></div>;
}
