import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { cancelReceptionVisit, completeTriage, createVisitVitalSigns, generateInvoiceFromVisit, getAdmissionStatsToday, getCompletedTriages, getDoctorWaitingRoom, getPendingBillingVisits, getTriageQueue, getVisit, getVisitVitalSigns, getVisits, registerWalkIn, sendVisitToDoctor, sendVisitToTriage, startTriage, startVisitConsultation } from "../../api/admissionsApi";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { getClinicWorkflowSettings } from "../../api/clinicSettingsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { AdmissionStats, CompleteTriagePayload, PatientVisit, VisitPriority } from "../../types/admission";
import type { DoctorProfile } from "../../types/doctor";
import type { VitalSigns, VitalSignsPayload } from "../../types/medicalRecord";
import type { Patient } from "../../types/patient";
import type { ClinicWorkflowSettings } from "../../types/clinicSettings";
import { cleanDecimal, digitInputProps, onlyDigits, onlyPhoneChars, phoneInputProps } from "../../utils/inputSanitizers";
import { DollarSign } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { roleNameFromUser } from "../../utils/roleHome";

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
    { key: "patient", header: "Paciente", render: (v) => <div><p className="font-semibold">{v.patient_nombre}</p><p className="text-xs text-slate-500">{v.visit_number} · {v.visit_type === "appointment" ? "Cita" : "Sin cita"}</p></div> },
    { key: "reason", header: "Motivo", render: (v) => v.reason },
    { key: "wait", header: "Espera", render: (v) => `${v.waiting_minutes ?? 0} min` },
    { key: "priority", header: "Prioridad", render: (v) => ({ normal: "Normal", priority: "Prioritario", urgent: "Urgente", emergency: "Emergencia" }[v.priority] || v.priority) },
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
  const [workflow, setWorkflow] = useState<ClinicWorkflowSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { Promise.all([getPatients({ is_active: "true" }), getDoctors({ is_active: "true" }), getClinicWorkflowSettings()]).then(([p, d, w]) => { setPatients(p); setDoctors(d); setWorkflow(w); }).catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    let duplicateWarningConfirmed = false;
    if (workflow && !workflow.allow_walk_in_patients) {
      toast.error("La clínica no permite admisiones sin cita.");
      return;
    }
    if (mode === "new") {
      const identity = onlyDigits(patientData.identidad);
      const phone = onlyDigits(patientData.telefono);
      const identityDuplicate = patients.find((item) => identity && onlyDigits(item.identidad || "") === identity);
      if (identityDuplicate) {
        setMode("existing");
        setPatient(String(identityDuplicate.id));
        toast.warning("Ya existe un paciente con esa identidad. Se seleccionó el registro existente.");
        return;
      }
      const fullName = `${patientData.nombres} ${patientData.apellidos}`.trim().toLocaleLowerCase();
      const probableDuplicate = patients.find((item) =>
        (phone && onlyDigits(item.telefono || "") === phone)
        || Boolean(patientData.fecha_nacimiento && item.fecha_nacimiento === patientData.fecha_nacimiento && item.nombre_completo.trim().toLocaleLowerCase() === fullName)
      );
      if (probableDuplicate) {
        const useExisting = window.confirm("Encontramos un paciente con información similar. Acepta para usar el registro existente o cancela para revisar si debes crear uno nuevo.");
        if (useExisting) {
          setMode("existing");
          setPatient(String(probableDuplicate.id));
          return;
        }
        duplicateWarningConfirmed = window.confirm("¿Confirmas que deseas crear un paciente nuevo pese a la coincidencia encontrada?");
        if (!duplicateWarningConfirmed) return;
      }
    }
    setSaving(true);
    try {
      const created = await registerWalkIn({ patient: mode === "existing" ? Number(patient) : null, patient_data: mode === "new" ? { ...patientData, duplicate_warning_confirmed: duplicateWarningConfirmed } : undefined, visit: { ...visit, assigned_doctor: visit.assigned_doctor ? Number(visit.assigned_doctor) : null } });
      toast.success("Atencion registrada correctamente.");
      navigate(`/clinic/admissions/visits/${created.id}`);
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  }
  if (workflow && !workflow.allow_walk_in_patients) return <div className="space-y-6"><PageHeader title="Nueva atención" description="Registro de pacientes sin cita." /><EmptyState title="Admisiones sin cita deshabilitadas" description="La configuración de esta clínica no permite registrar pacientes sin cita." /></div>;
  return <div className="space-y-6"><PageHeader title="Nueva atencion" description="Registro rapido para pacientes con o sin cita." /><Card><form className="grid gap-4" onSubmit={submit}><div className="flex gap-2"><Button type="button" variant={mode === "existing" ? "primary" : "outline"} onClick={() => setMode("existing")}>Paciente existente</Button>{workflow?.reception_can_create_minimal_patient !== false ? <Button type="button" variant={mode === "new" ? "primary" : "outline"} onClick={() => setMode("new")}>Paciente nuevo</Button> : null}</div>{mode === "existing" ? <select className="h-11 rounded-md border px-3 text-sm" required value={patient} onChange={(e) => setPatient(e.target.value)}><option value="">Selecciona paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo} | {p.identidad || p.telefono}</option>)}</select> : <div className="grid gap-3 md:grid-cols-3"><input className="h-11 rounded-md border px-3 text-sm" placeholder="Nombres" required value={patientData.nombres} onChange={(e) => setPatientData({ ...patientData, nombres: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" placeholder="Apellidos" required value={patientData.apellidos} onChange={(e) => setPatientData({ ...patientData, apellidos: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" maxLength={20} placeholder="Identidad" required={workflow?.require_identity_for_patient} value={patientData.identidad} {...digitInputProps} onChange={(e) => setPatientData({ ...patientData, identidad: onlyDigits(e.target.value) })} /><input className="h-11 rounded-md border px-3 text-sm" type="date" max={new Date().toISOString().slice(0, 10)} value={patientData.fecha_nacimiento} onChange={(e) => setPatientData({ ...patientData, fecha_nacimiento: e.target.value })} /><select className="h-11 rounded-md border px-3 text-sm" value={patientData.genero} onChange={(e) => setPatientData({ ...patientData, genero: e.target.value })}><option value="no_especificado">No especificado</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option></select><input className="h-11 rounded-md border px-3 text-sm" maxLength={30} placeholder="Telefono" required={workflow?.require_phone_for_patient} value={patientData.telefono} {...phoneInputProps} onChange={(e) => setPatientData({ ...patientData, telefono: onlyPhoneChars(e.target.value) })} /></div>}<div className="grid gap-3 md:grid-cols-2"><input className="h-11 rounded-md border px-3 text-sm" placeholder="Motivo de visita" required value={visit.reason} onChange={(e) => setVisit({ ...visit, reason: e.target.value })} /><select className="h-11 rounded-md border px-3 text-sm" value={visit.priority} onChange={(e) => setVisit({ ...visit, priority: e.target.value })}><option value="normal">Normal</option><option value="priority">Prioritario</option><option value="urgent">Urgente</option><option value="emergency">Emergencia</option></select><select className="h-11 rounded-md border px-3 text-sm" required={workflow?.walk_in_requires_triage === false} value={visit.assigned_doctor} onChange={(e) => setVisit({ ...visit, assigned_doctor: e.target.value })}><option value="">Medico sin asignar</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.user_nombre}</option>)}</select><input className="h-11 rounded-md border px-3 text-sm" placeholder="Sintomas iniciales" value={visit.symptoms} onChange={(e) => setVisit({ ...visit, symptoms: e.target.value })} /></div><Button type="submit" isLoading={saving}>Registrar atencion</Button></form></Card></div>;
}

export function AdmissionVisitDetailsPage() {
  const { id } = useParams();
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [signs, setSigns] = useState<VitalSigns[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [workflow, setWorkflow] = useState<ClinicWorkflowSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const role = roleNameFromUser(user);
  const navigate = useNavigate();
  async function load() {
    if (!id) return;
    const [v, s, w] = await Promise.all([getVisit(id), getVisitVitalSigns(id), getClinicWorkflowSettings()]);
    setVisit(v);
    setSigns(s);
    setWorkflow(w);
  }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  async function run(action: "triage" | "doctor" | "invoice" | "cancel") {
    if (!visit || busy) return;
    setBusy(true);
    try {
      if (action === "triage") {
        setVisit(await sendVisitToTriage(visit.id));
        toast.success("Paciente enviado a triaje.");
      }
      if (action === "doctor") {
        setVisit(await sendVisitToDoctor(visit.id));
        toast.success("Paciente enviado a medico.");
      }
      if (action === "invoice") {
        const invoice = await generateInvoiceFromVisit(visit.id);
        toast.success("Factura generada desde visita.");
        navigate(`/clinic/billing/invoices/${invoice.id}`);
      }
      if (action === "cancel") {
        if (cancelReason.trim().length < 5) {
          toast.error("Indica un motivo claro de cancelacion.");
          return;
        }
        setVisit(await cancelReceptionVisit(visit.id, cancelReason.trim()));
        setCancelOpen(false);
        setCancelReason("");
        toast.success("Admision cancelada correctamente.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  }
  if (!visit) return <Loader />;
  const receptionRole = ["admin", "recepcionista"].includes(role);
  const requiresTriage = visit.visit_type === "appointment" ? workflow?.appointment_requires_triage : workflow?.walk_in_requires_triage;
  const canSendTriage = receptionRole && ["registered", "waiting_doctor"].includes(visit.status);
  const canSendDoctor = receptionRole && requiresTriage === false && Boolean(visit.assigned_doctor) && ["registered", "waiting_triage"].includes(visit.status);
  const canCancel = receptionRole && ["registered", "waiting_triage", "waiting_doctor"].includes(visit.status);
  const canInvoice = visit.status === "waiting_billing" && !visit.invoice;
  return <div className="space-y-6"><PageHeader title={`Atencion ${visit.visit_number}`} description={visit.patient_nombre || ""} actions={<div className="flex flex-wrap gap-2"><Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold" to="/clinic/admissions">Volver</Link>{canSendTriage ? <Button disabled={busy} variant="outline" onClick={() => run("triage")}>Enviar a triaje</Button> : null}{canSendDoctor ? <Button disabled={busy} variant="outline" onClick={() => run("doctor")}>Enviar a medico</Button> : null}{canInvoice ? <Button disabled={busy} onClick={() => run("invoice")}>Generar factura</Button> : null}{canCancel ? <Button disabled={busy} variant="danger" onClick={() => setCancelOpen(true)}>Cancelar admision</Button> : null}</div>} /><Card><div className="grid gap-3 text-sm md:grid-cols-3"><p><b>Estado:</b> {statusLabel[visit.status]}</p><p><b>Prioridad:</b> {visit.priority}</p><p><b>Motivo:</b> {visit.reason}</p><p><b>Sintomas:</b> {visit.symptoms || "-"}</p><p><b>Medico:</b> {visit.assigned_doctor_nombre || "-"}</p><p><b>Enfermera:</b> {visit.assigned_nurse_nombre || "-"}</p><p><b>Factura:</b> {visit.invoice ? `#${visit.invoice}` : "Sin factura"}</p></div></Card><Card title="Signos vitales">{signs.length ? <Table data={signs} columns={[{ key: "date", header: "Fecha", render: (s) => s.recorded_at?.slice(0, 16).replace("T", " ") }, { key: "bp", header: "Presion", render: (s) => `${s.blood_pressure_systolic || "-"} / ${s.blood_pressure_diastolic || "-"}` }, { key: "temp", header: "Temp.", render: (s) => s.temperature || "-" }, { key: "ox", header: "Oxigeno", render: (s) => s.oxygen_saturation || "-" }, { key: "bmi", header: "IMC", render: (s) => s.bmi || "-" }]} /> : <EmptyState title="Sin signos vitales." description="La evaluacion de enfermeria aparecera aqui." />}</Card><Modal open={cancelOpen} title="Cancelar admision" onClose={() => setCancelOpen(false)} actions={<><ModalCloseButton onClick={() => setCancelOpen(false)} /><Button disabled={busy} variant="danger" onClick={() => run("cancel")}>Confirmar cancelacion</Button></>}><div className="space-y-3"><p className="text-sm text-slate-600">Escribe el motivo. La cancelacion quedara registrada en auditoria.</p><textarea className="min-h-28 w-full rounded-md border px-3 py-2 text-sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ej. Paciente decide retirarse antes de ser atendido" /></div></Modal></div>;
}

type VitalFormState = {
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  temperature: string;
  heart_rate: string;
  respiratory_rate: string;
  oxygen_saturation: string;
  weight: string;
  height: string;
  glucose: string;
  pain_scale: string;
  notes: string;
};

const emptyVitalForm: VitalFormState = {
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  temperature: "",
  heart_rate: "",
  respiratory_rate: "",
  oxygen_saturation: "",
  weight: "",
  height: "",
  glucose: "",
  pain_scale: "",
  notes: "",
};

function VitalSignsMiniForm({ visit, onSaved }: { visit: PatientVisit; onSaved: () => void }) {
  const current = visit.vital_signs;
  const [form, setForm] = useState<VitalFormState>({
    ...emptyVitalForm,
    blood_pressure_systolic: current?.blood_pressure_systolic?.toString() ?? "",
    blood_pressure_diastolic: current?.blood_pressure_diastolic?.toString() ?? "",
    temperature: current?.temperature ?? "",
    heart_rate: current?.heart_rate?.toString() ?? "",
    respiratory_rate: current?.respiratory_rate?.toString() ?? "",
    oxygen_saturation: current?.oxygen_saturation?.toString() ?? "",
    weight: current?.weight ?? "",
    height: current?.height ?? "",
    glucose: current?.glucose?.toString() ?? "",
    pain_scale: current?.pain_scale?.toString() ?? "",
    notes: current?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const fields: { key: keyof VitalFormState; label: string; decimal?: boolean }[] = [
    { key: "temperature", label: "Temperatura (°C)", decimal: true },
    { key: "blood_pressure_systolic", label: "Presión sistólica" },
    { key: "blood_pressure_diastolic", label: "Presión diastólica" },
    { key: "heart_rate", label: "Frecuencia cardíaca" },
    { key: "respiratory_rate", label: "Frecuencia respiratoria" },
    { key: "oxygen_saturation", label: "Saturación de oxígeno (%)" },
    { key: "weight", label: "Peso (kg)", decimal: true },
    { key: "height", label: "Altura (m)", decimal: true },
    { key: "glucose", label: "Glucosa" },
    { key: "pain_scale", label: "Dolor (0 a 10)" },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const number = (key: keyof VitalFormState) => form[key] === "" ? undefined : Number(form[key]);
    const systolic = number("blood_pressure_systolic");
    const diastolic = number("blood_pressure_diastolic");
    const weight = number("weight");
    const height = number("height");
    if (!fields.some(({ key }) => form[key] !== "")) return toast.error("Registra al menos un signo vital.");
    if ((systolic === undefined) !== (diastolic === undefined)) return toast.error("Registra ambos valores de presión arterial.");
    if (systolic !== undefined && diastolic !== undefined && systolic <= diastolic) return toast.error("La presión sistólica debe ser mayor que la diastólica.");
    if ((weight === undefined) !== (height === undefined)) return toast.error("Registra peso y altura juntos para calcular el IMC.");
    const oxygen = number("oxygen_saturation");
    const pain = number("pain_scale");
    if (oxygen !== undefined && (oxygen < 0 || oxygen > 100)) return toast.error("La saturación debe estar entre 0 y 100.");
    if (pain !== undefined && (pain < 0 || pain > 10)) return toast.error("La escala de dolor debe estar entre 0 y 10.");
    const warnings: string[] = [];
    const temperature = number("temperature");
    const heart = number("heart_rate");
    const respiratory = number("respiratory_rate");
    const glucose = number("glucose");
    if (temperature !== undefined && (temperature < 35 || temperature >= 38)) warnings.push("Temperatura fuera del rango habitual");
    if (oxygen !== undefined && oxygen < 92) warnings.push("Saturación de oxígeno fuera del rango habitual");
    if (heart !== undefined && (heart < 50 || heart > 120)) warnings.push("Frecuencia cardíaca fuera del rango habitual");
    if (respiratory !== undefined && (respiratory < 10 || respiratory > 24)) warnings.push("Frecuencia respiratoria fuera del rango habitual");
    if (systolic !== undefined && diastolic !== undefined && (systolic < 90 || systolic >= 180 || diastolic >= 120)) warnings.push("Presión arterial requiere revisión");
    if (pain !== undefined && pain >= 8) warnings.push("Dolor elevado");
    if (glucose !== undefined && (glucose < 70 || glucose > 250)) warnings.push("Glucosa fuera del rango habitual");
    if (warnings.length && !window.confirm(`${warnings.join(". ")}. Confirma el valor antes de continuar.`)) return;
    const payload: VitalSignsPayload = {
      temperature: form.temperature || undefined,
      blood_pressure_systolic: systolic,
      blood_pressure_diastolic: diastolic,
      heart_rate: heart,
      respiratory_rate: respiratory,
      oxygen_saturation: oxygen,
      weight: form.weight || undefined,
      height: form.height || undefined,
      glucose,
      pain_scale: pain,
      notes: form.notes.trim(),
      confirm_out_of_range: warnings.length > 0,
    };
    try {
      setSaving(true);
      await createVisitVitalSigns(visit.id, payload);
      toast.success(current ? "Signos vitales actualizados." : "Signos vitales registrados.");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>{fields.map(({ key, label, decimal }) => <label className="grid gap-1 text-sm font-semibold text-slate-700" key={key}>{label}<input className="h-10 rounded-md border px-3 text-sm font-normal" inputMode={decimal ? "decimal" : "numeric"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: decimal ? cleanDecimal(e.target.value, 2) : onlyDigits(e.target.value) })} /></label>)}<label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Observaciones<textarea className="min-h-24 rounded-md border px-3 py-2 text-sm font-normal" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><div className="md:col-span-2"><Button type="submit" isLoading={saving}>{current ? "Actualizar signos" : "Guardar signos"}</Button></div></form>;
}

function CompleteTriageForm({ visit, onCompleted }: { visit: PatientVisit; onCompleted: () => void }) {
  const [form, setForm] = useState<CompleteTriagePayload>({ chief_complaint: visit.reason || "", initial_assessment: visit.symptoms || "", priority: visit.priority || "normal", notes: visit.notes || "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (form.chief_complaint.trim().length < 5) return toast.error("El motivo principal debe tener al menos 5 caracteres.");
    if (form.initial_assessment.trim().length < 10) return toast.error("La evaluación inicial debe tener al menos 10 caracteres.");
    if (!visit.vital_signs) return toast.error("Registra signos vitales antes de completar el triaje.");
    if (!window.confirm("El paciente será enviado a la sala médica. ¿Deseas completar el triaje?")) return;
    try {
      setSaving(true);
      await completeTriage(visit.id, form);
      toast.success("Triaje completado y paciente enviado a la sala médica.");
      onCompleted();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return <form className="grid gap-4" onSubmit={submit}><div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm"><p className="font-semibold text-rose-800">Alergias</p><p className="text-rose-700">{visit.patient_alergias || "No hay alergias registradas."}</p></div><div className="rounded-md border bg-slate-50 p-3 text-sm"><p className="font-semibold">Antecedentes críticos</p><p>{visit.patient_enfermedades_cronicas || "No hay antecedentes críticos registrados."}</p><p className="mt-2 font-semibold">Contacto de emergencia</p><p>{visit.patient_contacto_emergencia_nombre ? [visit.patient_contacto_emergencia_nombre, visit.patient_contacto_emergencia_parentesco, visit.patient_contacto_emergencia_telefono].filter(Boolean).join(" · ") : "No registrado"}</p></div><label className="grid gap-1 text-sm font-semibold">Motivo principal<textarea className="min-h-20 rounded-md border px-3 py-2 font-normal" required value={form.chief_complaint} onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} /></label><label className="grid gap-1 text-sm font-semibold">Evaluación inicial<textarea className="min-h-28 rounded-md border px-3 py-2 font-normal" required value={form.initial_assessment} onChange={(e) => setForm({ ...form, initial_assessment: e.target.value })} /></label><label className="grid gap-1 text-sm font-semibold">Prioridad<select className="h-10 rounded-md border px-3 font-normal" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as VisitPriority })}><option value="normal">Normal</option><option value="priority">Prioritario</option><option value="urgent">Urgente</option><option value="emergency">Emergencia</option></select></label><label className="grid gap-1 text-sm font-semibold">Notas<textarea className="min-h-20 rounded-md border px-3 py-2 font-normal" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><Button type="submit" isLoading={saving}>Completar triaje</Button></form>;
}

export function TriageQueuePage() {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [completed, setCompleted] = useState<PatientVisit[]>([]);
  const [selectedSigns, setSelectedSigns] = useState<PatientVisit | null>(null);
  const [selectedComplete, setSelectedComplete] = useState<PatientVisit | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    try {
      setError("");
      const [queue, history] = await Promise.all([getTriageQueue(), getCompletedTriages()]);
      setVisits(queue);
      setCompleted(history);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  async function begin(visit: PatientVisit) {
    if (busyId) return;
    try {
      setBusyId(visit.id);
      await startTriage(visit.id);
      toast.success("Triaje iniciado.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }
  if (loading) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Triaje" description="Evaluación inicial, signos vitales y prioridad clínica." actions={<Button variant="outline" onClick={() => void load()}>Actualizar</Button>} />{error ? <Card><div className="space-y-3 text-center"><p className="font-semibold text-red-700">No se pudo cargar la información.</p><p className="text-sm text-slate-600">{error}</p><Button variant="outline" onClick={() => void load()}>Reintentar</Button></div></Card> : <><Card title="Cola de triaje"><VisitTable visits={visits} actions={(v) => <div className="flex flex-wrap gap-2">{v.status === "waiting_triage" ? <Button className="h-8 px-3 text-xs" isLoading={busyId === v.id} variant="outline" onClick={() => void begin(v)}>Iniciar triaje</Button> : null}{v.status === "in_triage" ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => setSelectedSigns(v)}>{v.vital_signs ? "Corregir signos" : "Registrar signos"}</Button> : null}{v.status === "in_triage" ? <Button className="h-8 px-3 text-xs" disabled={!v.vital_signs} onClick={() => v.vital_signs ? setSelectedComplete(v) : toast.error("Registra signos vitales antes de completar el triaje.")}>Completar</Button> : null}</div>} /></Card><Card title="Triajes completados"><VisitTable visits={completed} actions={(v) => <Link className="rounded-md border px-3 py-1 text-xs font-semibold" to={`/clinic/admissions/visits/${v.id}`}>Ver detalle</Link>} /></Card></>}<Modal open={Boolean(selectedSigns)} title={`Signos vitales · ${selectedSigns?.patient_nombre ?? ""}`} onClose={() => setSelectedSigns(null)} actions={<ModalCloseButton onClick={() => setSelectedSigns(null)} />}>{selectedSigns ? <VitalSignsMiniForm visit={selectedSigns} onSaved={async () => { setSelectedSigns(null); await load(); }} /> : null}</Modal><Modal open={Boolean(selectedComplete)} title={`Completar triaje · ${selectedComplete?.patient_nombre ?? ""}`} onClose={() => setSelectedComplete(null)} actions={<ModalCloseButton onClick={() => setSelectedComplete(null)} />}>{selectedComplete ? <CompleteTriageForm visit={selectedComplete} onCompleted={async () => { setSelectedComplete(null); await load(); }} /> : null}</Modal></div>;
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
