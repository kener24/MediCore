import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Bell, CalendarClock, CheckCheck, Download, FileText, Receipt } from "lucide-react";

import { cancelPatientAppointment, getPatientDoctorAvailability, getPatientMedicalRecordSummary, getPatientPortalAppointment, getPatientPortalAppointments, getPatientPortalClinicInfo, getPatientPortalCreditNotePdf, getPatientPortalCreditNotes, getPatientPortalDashboard, getPatientPortalDoctors, getPatientPortalInvoice, getPatientPortalInvoicePdf, getPatientPortalInvoices, getPatientPortalMedicalOrder, getPatientPortalMedicalOrders, getPatientPortalNotification, getPatientPortalNotifications, getPatientPortalPayment, getPatientPortalPaymentReceipt, getPatientPortalPayments, getPatientPortalPrescription, getPatientPortalPrescriptionPdf, getPatientPortalPrescriptions, getPatientPortalProfile, getPatientPortalSpecialties, markAllPatientPortalNotificationsRead, markPatientPortalNotificationRead, requestPatientAppointment, reschedulePatientAppointment, updatePatientPortalProfile } from "../../api/patientPortalApi";
import { getErrorMessage } from "../../api/axios";
import { downloadBlob } from "../../api/billingApi";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { InvoiceStatusBadge } from "../../components/ui/BillingBadges";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { Appointment, AppointmentAvailability } from "../../types/appointment";
import type { MedicalOrder, Prescription } from "../../types/prescription";
import type { PatientClinicInfo, PatientMedicalRecordSummary, PatientPortalCreditNote, PatientPortalDashboard, PatientPortalInvoice, PatientPortalNotification, PatientPortalPayment, PatientPortalProfile } from "../../types/patientPortal";

const money = (v?: string | number | null) => `L ${Number(v ?? 0).toFixed(2)}`;
const appointmentDoctor = (item: Appointment) => item.doctor_name ?? (item as any).doctor_nombre ?? "-";

function LoadError({ message }: { message: string }) {
  return <EmptyState title="No se pudo cargar esta pagina." description={message} />;
}

export function PatientPortalDashboardPage() {
  const [data, setData] = useState<PatientPortalDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalDashboard().then(setData).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  if (!data) return <Loader />;
  const accessLink = "rounded-md border px-4 py-3 text-sm font-semibold";
  return <div className="space-y-6">
    <PageHeader title={`Hola, ${data.patient.nombre_completo}`} description={data.clinic.nombre} />
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="Próximas citas" value={data.upcoming_appointments.length} icon={<CalendarClock className="h-5 w-5" />} />
      <StatCard label="Recetas recientes" value={data.recent_prescriptions.length} icon={<FileText className="h-5 w-5" />} />
      <StatCard label="Facturas pendientes" value={data.pending_invoices.length} icon={<Receipt className="h-5 w-5" />} />
      <StatCard label="Notificaciones" value={data.unread_notifications} icon={<Bell className="h-5 w-5" />} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Próxima actividad">{data.upcoming_appointments.length ? <Table data={data.upcoming_appointments} columns={[{ key: "date", header: "Fecha", render: (i) => i.scheduled_date }, { key: "doctor", header: "Médico", render: appointmentDoctor }, { key: "modality", header: "Modalidad", render: (i) => i.modality === "online" ? "En línea" : "Presencial" }, { key: "status", header: "Estado", render: (i) => <AppointmentStatusBadge status={i.status} /> }]} /> : <EmptyState title="Sin citas próximas." description="Puedes solicitar una cita presencial o en línea si tu clínica lo permite." />}</Card>
      <Card title="Accesos rápidos"><div className="grid gap-2 sm:grid-cols-2">
        {data.permissions.can_request_appointments ? <Link className={accessLink} to="/patient/appointments/request">Solicitar cita</Link> : null}
        {data.permissions.can_view_medical_record ? <Link className={accessLink} to="/patient/medical-record">Mi expediente</Link> : null}
        {data.permissions.can_view_prescriptions ? <Link className={accessLink} to="/patient/prescriptions">Mis recetas</Link> : null}
        <Link className={accessLink} to="/patient/clinic-info">Mi clínica</Link>
      </div></Card>
    </div>
  </div>;
}

export function PatientPortalProfilePage() {
  const [profile, setProfile] = useState<PatientPortalProfile | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { getPatientPortalProfile().then(setProfile).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  if (!profile) return <Loader />;
  async function submit(e: FormEvent) { e.preventDefault(); if (!profile || saving) return; setSaving(true); try { setProfile(await updatePatientPortalProfile(profile)); toast.success("Perfil actualizado."); } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); } }
  const set = (patch: Partial<PatientPortalProfile>) => setProfile({ ...profile, ...patch });
  return <form className="space-y-6" onSubmit={submit}><PageHeader title="Mi perfil" description="Puedes actualizar únicamente tus datos de contacto." actions={<Button>Guardar</Button>} /><Card title="Información personal"><div className="grid gap-3 md:grid-cols-2"><Info label="Código" value={profile.codigo_paciente} /><Info label="Identidad" value={profile.identidad} /><Info label="Fecha de nacimiento" value={profile.fecha_nacimiento || "No registrado"} /><Info label="Género" value={profile.genero || "No registrado"} /><Info label="Tipo de sangre" value={profile.tipo_sangre || "No registrado"} /></div><p className="mt-4 text-sm text-slate-500">Para corregir tu nombre legal, identidad o fecha de nacimiento, comunícate con la clínica.</p></Card><Card title="Datos editables"><div className="grid gap-3 md:grid-cols-2"><Input label="Teléfono" value={profile.telefono} onChange={(v) => set({ telefono: v })} /><Input label="Correo" type="email" value={profile.correo} onChange={(v) => set({ correo: v })} /><Input label="Dirección" value={profile.direccion} onChange={(v) => set({ direccion: v })} /><Input label="Ciudad" value={profile.ciudad} onChange={(v) => set({ ciudad: v })} /><Input label="Departamento" value={profile.departamento} onChange={(v) => set({ departamento: v })} /><Input label="Contacto de emergencia" value={profile.contacto_emergencia_nombre} onChange={(v) => set({ contacto_emergencia_nombre: v })} /><Input label="Teléfono de emergencia" value={profile.contacto_emergencia_telefono} onChange={(v) => set({ contacto_emergencia_telefono: v })} /><Input label="Parentesco" value={profile.contacto_emergencia_parentesco} onChange={(v) => set({ contacto_emergencia_parentesco: v })} /></div></Card><Card title="Información clínica autorizada"><div className="grid gap-3 md:grid-cols-2"><Info label="Alergias" value={profile.alergias || "No hay alergias registradas."} /><Info label="Antecedentes" value={profile.enfermedades_cronicas || "No hay antecedentes registrados."} /></div><p className="mt-4 text-sm font-medium text-amber-700">La ausencia de registros no garantiza que no existan alergias o antecedentes. Comunícalos al personal médico.</p></Card></form>;
}

function Info({ label, value }: { label: string; value?: string }) { return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900">{value || "-"}</p></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value?: string; type?: string; onChange: (value: string) => void }) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>; }

export function PatientPortalAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  async function load() { setError(""); try { setItems(await getPatientPortalAppointments()); } catch (e) { const message = getErrorMessage(e); setError(message); toast.error(message); } }
  useEffect(() => { load(); }, []);
  if (error) return <LoadError message={error} />;
  async function submitCancel(e: FormEvent) { e.preventDefault(); if (!cancelling) return; try { await cancelPatientAppointment(cancelling.id, reason); toast.success("Cita cancelada."); setCancelling(null); await load(); } catch (error) { toast.error(getErrorMessage(error)); } }
  return <div className="space-y-6"><PageHeader title="Mis citas" description="Próximas citas e historial." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/patient/appointments/request">Solicitar cita</Link>} /><Card>{items.length ? <Table data={items} columns={[{ key: "date", header: "Fecha", render: (i) => i.scheduled_date }, { key: "doctor", header: "Médico", render: appointmentDoctor }, { key: "modality", header: "Modalidad", render: (i) => i.modality === "online" ? "En línea" : "Presencial" }, { key: "reason", header: "Motivo", render: (i) => i.reason }, { key: "status", header: "Estado", render: (i) => <AppointmentStatusBadge status={i.status} /> }, { key: "actions", header: "Acciones", render: (i) => <div className="flex flex-wrap gap-2"><Link className="rounded-md border px-2 py-1 text-xs" to={`/patient/appointments/${i.id}`}>Ver</Link>{i.can_reschedule !== false && !["cancelada", "atendida", "no_asistio"].includes(i.status) ? <Link className="rounded-md border px-2 py-1 text-xs text-amber-700" to={`/patient/appointments/${i.id}/reschedule`}>Reprogramar</Link> : null}{i.can_cancel !== false && !["cancelada", "atendida", "no_asistio"].includes(i.status) ? <button className="rounded-md border px-2 py-1 text-xs text-rose-700" onClick={() => { setReason(""); setCancelling(i); }}>Cancelar</button> : null}</div> }]} /> : <EmptyState title="No tienes citas programadas." description="Solicita una cita para comenzar." />}</Card><Modal open={Boolean(cancelling)} title="Cancelar cita" onClose={() => setCancelling(null)} actions={<><ModalCloseButton onClick={() => setCancelling(null)} /><Button disabled={reason.trim().length < 5} form="patient-cancel-form" type="submit" variant="danger">Cancelar</Button></>}><form id="patient-cancel-form" onSubmit={submitCancel}><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Indica el motivo de cancelación" required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} /></form></Modal></div>;
}

export function PatientPortalAppointmentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) getPatientPortalAppointment(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Detalle de cita" description={`${item.scheduled_date} ${item.start_time}`} actions={item.can_reschedule ? <Link className="rounded-md border px-4 py-2 text-sm font-semibold text-amber-700" to={`/patient/appointments/${item.id}/reschedule`}>Reprogramar</Link> : undefined} /><Card><div className="grid gap-4 md:grid-cols-2"><Info label="Médico" value={appointmentDoctor(item)} /><Info label="Especialidad" value={item.doctor_specialty} /><Info label="Modalidad" value={item.modality === "online" ? "En línea" : "Presencial"} /><Info label="Horario" value={`${item.start_time} - ${item.end_time}`} /><Info label="Motivo" value={item.reason} /><Info label="Estado" value={item.status_display || item.status} /><Info label="Notas" value={item.notes} /><Info label="Motivo última reprogramación" value={item.last_reschedule_reason} /></div></Card></div>;
}

export function PatientRequestAppointmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isReschedule = Boolean(id);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [availability, setAvailability] = useState<AppointmentAvailability | null>(null);
  const [form, setForm] = useState({ specialty: "", doctor: "", scheduled_date: "", start_time: "", reason: "", modality: "presencial" as "presencial" | "online" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  useEffect(() => { Promise.all([getPatientPortalDoctors(), getPatientPortalSpecialties(), id ? getPatientPortalAppointment(id) : Promise.resolve(null)]).then(([d, s, appointment]) => { setDoctors(d); setSpecialties(s); if (appointment) { const selectedDoctor = d.find((item) => String(item.id) === String(appointment.doctor)); setForm((current) => ({ ...current, specialty: selectedDoctor ? String(selectedDoctor.specialty ?? "") : "", doctor: String(appointment.doctor), modality: appointment.modality || "presencial", reason: "" })); } }).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  async function check() { if (!form.doctor || !form.scheduled_date) return; try { const data = await getPatientDoctorAvailability(form.doctor, form.scheduled_date, form.modality); setAvailability(data); if (form.modality === "online" && data.allow_online_appointments === false) toast.error(data.message || "Esta clínica no tiene habilitadas las citas en línea. Puedes solicitar una cita presencial."); } catch (e) { toast.error(getErrorMessage(e)); } }
  async function submit(e: FormEvent) { e.preventDefault(); if (submitting) return; const selectedDoctor = doctors.find((item) => String(item.id) === form.doctor); const specialtyName = specialties.find((item) => String(item.id) === form.specialty)?.nombre || "Especialidad"; const summary = `${specialtyName}\n${String(selectedDoctor?.user_nombre ?? "Médico")}\n${form.scheduled_date} ${form.start_time}\n${form.modality === "online" ? "En línea" : "Presencial"}`; if (!window.confirm(`${isReschedule ? "Después de confirmar se actualizará la misma cita." : "Confirma los datos de tu cita."}\n\n${summary}`)) return; setSubmitting(true); try { const payload = { doctor: form.doctor, scheduled_date: form.scheduled_date, start_time: form.start_time, reason: form.reason.trim(), modality: form.modality }; if (id) await reschedulePatientAppointment(id, payload, operationKey); else await requestPatientAppointment(payload, operationKey); toast.success(id ? "Cita reprogramada correctamente." : "Solicitud de cita enviada correctamente."); navigate("/patient/appointments", { replace: true }); } catch (error) { setOperationKey(crypto.randomUUID()); toast.error(getErrorMessage(error)); } finally { setSubmitting(false); } }
  const filteredDoctors = form.specialty ? doctors.filter((d) => String(d.specialty) === form.specialty) : doctors;
  return <form className="space-y-6" onSubmit={submit}><PageHeader title={isReschedule ? "Reprogramar cita" : "Solicitar cita"} description={isReschedule ? "Selecciona un nuevo horario; se conservará la misma cita y su trazabilidad." : "Selecciona médico, fecha, modalidad y horario disponible."} actions={<Button disabled={submitting}>{submitting ? "Procesando..." : isReschedule ? "Confirmar cambio" : "Solicitar"}</Button>} /><Card><div className="grid gap-3 md:grid-cols-2"><select className="h-11 rounded-md border px-3 text-sm" disabled={isReschedule} required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value, doctor: "", start_time: "" })}><option value="">Especialidad</option>{specialties.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select><select className="h-11 rounded-md border px-3 text-sm" disabled={isReschedule} required value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value, start_time: "" })}><option value="">Médico</option>{filteredDoctors.map((d) => <option key={d.id} value={d.id}>{String(d.user_nombre ?? d.id)}</option>)}</select><input className="h-11 rounded-md border px-3 text-sm" min={new Date().toISOString().slice(0, 10)} required type="date" value={form.scheduled_date} onChange={(e) => { setForm({ ...form, scheduled_date: e.target.value, start_time: "" }); setAvailability(null); }} /><div className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm md:col-span-2"><p className="font-semibold text-slate-700">Modalidad</p><div className="grid gap-2 sm:grid-cols-2"><button disabled={isReschedule} type="button" className={`rounded-md border px-4 py-3 text-left ${form.modality === "presencial" ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200"}`} onClick={() => { setForm({ ...form, modality: "presencial", start_time: "" }); setAvailability(null); }}><strong>Presencial</strong><span className="block text-xs text-slate-500">Atención en la clínica</span></button><button disabled={isReschedule} type="button" className={`rounded-md border px-4 py-3 text-left ${form.modality === "online" ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200"}`} onClick={() => { setForm({ ...form, modality: "online", start_time: "" }); setAvailability(null); }}><strong>En línea</strong><span className="block text-xs text-slate-500">Atención virtual si la clínica lo permite</span></button></div></div><Button type="button" variant="outline" onClick={check}>Consultar disponibilidad</Button><select className="h-11 rounded-md border px-3 text-sm" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}><option value="">Horario</option>{availability?.available_slots.map((slot) => <option key={slot.start_time} value={slot.start_time}>{slot.start_time} - {slot.end_time}</option>)}</select><textarea className="min-h-28 rounded-md border px-3 py-2 text-sm md:col-span-2" required minLength={5} maxLength={250} placeholder={isReschedule ? "Motivo de la reprogramación" : "Motivo de consulta"} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div></Card></form>;
}

export function PatientPortalPrescriptionsPage() { return <SimpleList title="Mis recetas" loader={getPatientPortalPrescriptions} columns={[["Numero", "prescription_number"], ["Fecha", "issue_date"], ["Estado", "status"]]} detailBase="/patient/prescriptions" />; }
export function PatientPortalMedicalOrdersPage() { return <SimpleList title="Mis ordenes medicas" loader={getPatientPortalMedicalOrders} columns={[["Orden", "order_number"], ["Tipo", "order_type"], ["Estado", "status"]]} detailBase="/patient/medical-orders" />; }
export function PatientPortalInvoicesPage() {
  const [items, setItems] = useState<PatientPortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalInvoices().then(setItems).catch((e) => setError(getErrorMessage(e))).finally(() => setLoading(false)); }, []);
  if (error) return <LoadError message={error} />;
  return <div className="space-y-6"><PageHeader title="Mis facturas" description="Consulta conceptos, pagos, saldos y documentos fiscales." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[
    { key: "number", header: "Factura", render: (item) => <div><Link className="font-semibold text-brand-700" to={`/patient/invoices/${item.id}`}>{item.invoice_number}</Link>{item.fiscal_number ? <p className="text-xs text-slate-500">{item.fiscal_number}</p> : null}</div> },
    { key: "date", header: "Fecha", render: (item) => item.issue_date },
    { key: "total", header: "Total", render: (item) => money(item.total_amount) },
    { key: "balance", header: "Saldo", render: (item) => money(item.balance_due) },
    { key: "status", header: "Estado", render: (item) => <InvoiceStatusBadge status={item.status} /> },
    { key: "credit", header: "Nota de crédito", render: (item) => item.related_credit_note?.credit_note_number || "-" },
  ]} /> : <EmptyState title="No tienes facturas." description="Las facturas emitidas por tu clínica aparecerán aquí." />}</Card></div>;
}

export function PatientPortalPaymentsPage() {
  const [items, setItems] = useState<PatientPortalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalPayments().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }).finally(() => setLoading(false)); }, []);
  if (error) return <LoadError message={error} />;
  return <div className="space-y-6"><PageHeader title="Mis pagos" description="Historial de pagos y recibos emitidos por la clínica." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "num", header: "Pago", render: (i) => <Link className="font-semibold text-brand-700" to={`/patient/payments/${i.id}`}>{i.payment_number}</Link> }, { key: "invoice", header: "Factura", render: (i) => i.invoice_number }, { key: "method", header: "Método", render: (i) => i.method_display }, { key: "amount", header: "Monto", render: (i) => money(i.amount) }, { key: "date", header: "Fecha", render: (i) => i.payment_date }, { key: "status", header: "Estado", render: (i) => i.status_display }]} /> : <EmptyState title="No tienes pagos registrados." description="Cuando la clínica aplique un pago aparecerá aquí." />}</Card></div>;
}

function SimpleList({ title, loader, columns, detailBase, moneyFields = [] }: { title: string; loader: () => Promise<any[]>; columns: [string, string][]; detailBase: string; moneyFields?: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { loader().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [loader]);
  if (error) return <LoadError message={error} />;
  return <div className="space-y-6"><PageHeader title={title} description="Informacion propia de tu portal." /><Card>{items.length ? <Table data={items} columns={[...columns.map(([header, key]) => ({ key, header, render: (i: any) => moneyFields.includes(key) ? money(i[key]) : String(i[key] ?? "-") })), { key: "actions", header: "Acciones", render: (i: any) => <Link className="rounded-md border px-2 py-1 text-xs" to={`${detailBase}/${i.id}`}>Ver</Link> }]} /> : <EmptyState title="No hay datos." description="Cuando existan registros apareceran aqui." />}</Card></div>;
}

export function PatientPortalPrescriptionDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Prescription | null>(null);
  const [error, setError] = useState("");
  const [openingPdf, setOpeningPdf] = useState(false);
  useEffect(() => { if (id) getPatientPortalPrescription(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  async function openPdf() {
    if (!id || openingPdf) return;
    setOpeningPdf(true);
    try {
      const blob = await getPatientPortalPrescriptionPdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOpeningPdf(false);
    }
  }
  return <div className="space-y-6"><PageHeader title={item.prescription_number} description="Receta médica emitida para ti." actions={<Button disabled={openingPdf} onClick={openPdf} type="button" variant="outline">{openingPdf ? "Abriendo..." : "Ver PDF"}</Button>} /><Card><div className="grid gap-4 md:grid-cols-3"><Info label="Médico" value={item.doctor_nombre} /><Info label="Fecha de emisión" value={item.issue_date} /><Info label="Estado" value={item.status_display ?? item.status} /><Info label="Tipo" value={item.prescription_type_display ?? item.prescription_type} /><Info label="Vence" value={item.expires_at ?? "Sin vencimiento registrado"} /><Info label="Clínica" value={item.clinic_nombre} /></div></Card><Card title="Medicamentos">{item.items?.length ? <Table data={item.items} columns={[{ key: "medication", header: "Medicamento", render: (i) => i.medication_name }, { key: "dosage", header: "Dosis", render: (i) => i.dosage }, { key: "frequency", header: "Frecuencia", render: (i) => i.frequency }, { key: "duration", header: "Duración", render: (i) => i.duration || "No registrada" }, { key: "route", header: "Vía", render: (i) => i.route_display ?? i.route }]} /> : <EmptyState title="Sin medicamentos disponibles." description="Comunícate con la clínica si consideras que falta información." />}</Card>{item.general_instructions ? <Card title="Indicaciones generales"><p className="whitespace-pre-wrap text-sm text-slate-700">{item.general_instructions}</p></Card> : null}</div>;
}

export function PatientPortalMedicalOrderDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<MedicalOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) getPatientPortalMedicalOrder(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={item.order_number} description={item.title || "Orden médica"} /><Card><div className="grid gap-4 md:grid-cols-3"><Info label="Médico" value={item.doctor_nombre} /><Info label="Tipo" value={item.order_type_display ?? item.order_type} /><Info label="Estado" value={item.status_display ?? item.status} /><Info label="Prioridad" value={item.priority_display ?? item.priority} /><Info label="Programada" value={item.scheduled_at ?? "No programada"} /><Info label="Vence" value={item.expires_at ?? "Sin vencimiento registrado"} /><Info label="Área" value={item.execution_area || "No registrada"} /><Info label="Clínica" value={item.clinic_nombre} /></div></Card>{item.description ? <Card title="Descripción"><p className="whitespace-pre-wrap text-sm text-slate-700">{item.description}</p></Card> : null}{item.instructions ? <Card title="Instrucciones"><p className="whitespace-pre-wrap text-sm text-slate-700">{item.instructions}</p></Card> : null}{item.result_summary ? <Card title="Resultado disponible"><p className="whitespace-pre-wrap text-sm text-slate-700">{item.result_summary}</p></Card> : null}</div>;
}
export function PatientPortalInvoiceDetailsPage() { return <InvoiceDetails />; }

function InvoiceDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<PatientPortalInvoice | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { if (id) getPatientPortalInvoice(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  async function downloadPdf() { if (!id || downloading) return; setDownloading(true); try { downloadBlob(await getPatientPortalInvoicePdf(id), `factura-${item?.invoice_number || id}.pdf`); } catch (e) { toast.error(getErrorMessage(e)); } finally { setDownloading(false); } }
  return <div className="space-y-6"><PageHeader title={item.invoice_number} description={item.is_fiscal ? `Factura fiscal ${item.fiscal_number || ""}` : "Factura no fiscal"} actions={item.pdf_available ? <Button type="button" variant="outline" icon={<Download className="h-4 w-4" />} isLoading={downloading} onClick={downloadPdf}>Descargar PDF</Button> : null} /><Card><div className="grid gap-4 md:grid-cols-4"><Info label="Total" value={money(item.total_amount)} /><Info label="Pagado" value={money(item.paid_amount)} /><Info label="Saldo" value={money(item.balance_due)} /><div><p className="text-xs font-semibold uppercase text-slate-500">Estado</p><div className="mt-1"><InvoiceStatusBadge status={item.status} /></div></div><Info label="Fecha" value={item.issue_date} /><Info label="Vencimiento" value={item.due_date || "Sin vencimiento"} /><Info label="Cliente" value={item.customer_name || item.patient_name} /><Info label="RTN cliente" value={item.customer_rtn || "No registrado"} /></div></Card><Card title="Conceptos">{item.items?.length ? <Table data={item.items} columns={[{ key: "description", header: "Descripción", render: (i) => i.description }, { key: "quantity", header: "Cantidad", render: (i) => i.quantity }, { key: "unit", header: "Precio", render: (i) => money(i.unit_price) }, { key: "tax", header: "Impuesto", render: (i) => i.tax_type_display }, { key: "total", header: "Total", render: (i) => money(i.line_total) }]} /> : <EmptyState title="Factura sin conceptos visibles." />}</Card><Card title="Pagos aplicados">{item.payments?.length ? <Table data={item.payments} columns={[{ key: "number", header: "Pago", render: (p) => <Link className="font-semibold text-brand-700" to={`/patient/payments/${p.id}`}>{p.payment_number}</Link> }, { key: "date", header: "Fecha", render: (p) => p.payment_date }, { key: "amount", header: "Monto", render: (p) => money(p.amount) }, { key: "status", header: "Estado", render: (p) => p.status_display }]} /> : <EmptyState title="Aún no hay pagos aplicados." />}</Card>{item.related_credit_note ? <Card title="Nota de crédito"><div className="grid gap-4 md:grid-cols-3"><Info label="Número" value={item.related_credit_note.credit_note_number} /><Info label="Motivo" value={item.related_credit_note.reason} /><Info label="Total" value={money(item.related_credit_note.total_amount)} /></div></Card> : null}</div>;
}

export function PatientPortalPaymentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<PatientPortalPayment | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { if (id) getPatientPortalPayment(id).then(setItem).catch((e) => setError(getErrorMessage(e))); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  async function receipt() { if (!id || !item) return; const filename = `recibo-${item.payment_number}.pdf`; setDownloading(true); try { downloadBlob(await getPatientPortalPaymentReceipt(id), filename); } catch (e) { toast.error(getErrorMessage(e)); } finally { setDownloading(false); } }
  return <div className="space-y-6"><PageHeader title={item.payment_number} description={`Pago asociado a ${item.invoice_number}`} actions={item.receipt_available ? <Button type="button" variant="outline" icon={<Download className="h-4 w-4" />} isLoading={downloading} onClick={receipt}>Descargar recibo</Button> : null} /><Card><div className="grid gap-4 md:grid-cols-3"><Info label="Monto" value={money(item.amount)} /><Info label="Método" value={item.method_display} /><Info label="Fecha" value={item.payment_date} /><Info label="Estado" value={item.status_display} /><Info label="Referencia" value={item.reference_visible || "Sin referencia"} /><Info label="Saldo posterior" value={money(item.balance_after)} /></div></Card>{item.status === "anulado" ? <Card title="Pago anulado"><p className="text-sm text-rose-700">Este registro se conserva únicamente como historial y no permite descargar recibo.</p></Card> : null}</div>;
}

export function PatientPortalCreditNotesPage() {
  const [items, setItems] = useState<PatientPortalCreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getPatientPortalCreditNotes().then(setItems).catch((e) => toast.error(getErrorMessage(e))).finally(() => setLoading(false)); }, []);
  async function pdf(note: PatientPortalCreditNote) { try { downloadBlob(await getPatientPortalCreditNotePdf(note.id), `nota-credito-${note.credit_note_number}.pdf`); } catch (e) { toast.error(getErrorMessage(e)); } }
  return <div className="space-y-6"><PageHeader title="Mis notas de crédito" description="Documentos de anulación o ajuste vinculados a tus facturas." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "number", header: "Nota", render: (n) => n.credit_note_number }, { key: "invoice", header: "Factura", render: (n) => n.original_invoice_number }, { key: "date", header: "Fecha", render: (n) => n.issue_date }, { key: "reason", header: "Motivo", render: (n) => n.reason }, { key: "total", header: "Total", render: (n) => money(n.total_amount) }, { key: "pdf", header: "", render: (n) => <Button type="button" variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => pdf(n)}>PDF</Button> }]} /> : <EmptyState title="No tienes notas de crédito." />}</Card></div>;
}

export function PatientPortalNotificationsPage() {
  const [items, setItems] = useState<PatientPortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { setItems(await getPatientPortalNotifications()); } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function readAll() { try { const result = await markAllPatientPortalNotificationsRead(); toast.success(`${result.updated} notificaciones marcadas como leídas.`); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  return <div className="space-y-6"><PageHeader title="Notificaciones" description="Avisos de citas, documentos, facturas y pagos." actions={<Button type="button" icon={<CheckCheck className="h-4 w-4" />} onClick={readAll}>Marcar todas como leídas</Button>} /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "title", header: "Notificación", render: (n) => <div><Link className="font-semibold text-brand-700" to={`/patient/notifications/${n.id}`}>{n.title}</Link><p className="mt-1 text-xs text-slate-500">{n.message}</p></div> }, { key: "type", header: "Tipo", render: (n) => n.notification_type_display }, { key: "date", header: "Fecha", render: (n) => new Date(n.creado_en).toLocaleString() }, { key: "status", header: "Estado", render: (n) => n.status === "unread" ? "No leída" : "Leída" }]} /> : <EmptyState title="No tienes notificaciones." description="Los avisos importantes aparecerán aquí." />}</Card></div>;
}

export function PatientPortalNotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<PatientPortalNotification | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!id) return; getPatientPortalNotification(id).then(async (notification) => { const current = notification.status === "unread" ? await markPatientPortalNotificationRead(id) : notification; setItem(current); }).catch((e) => setError(getErrorMessage(e))); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={item.title} description={new Date(item.creado_en).toLocaleString()} actions={item.target ? <Button type="button" onClick={() => navigate(item.target!.path)}>Abrir</Button> : null} /><Card><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p></Card></div>;
}

export function PatientMedicalRecordSummaryPage() {
  const [data, setData] = useState<PatientMedicalRecordSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getPatientMedicalRecordSummary().then(setData).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  if (!data) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Mi expediente" description={data.record_number} /><Card title="Resumen"><div className="grid gap-4 md:grid-cols-2"><Info label="Tipo sangre" value={data.blood_type} /><Info label="Alergias" value={data.allergies} /><Info label="Enfermedades cronicas" value={data.chronic_diseases} /><Info label="Medicamentos actuales" value={data.current_medications} /></div></Card><Card title="Consultas finalizadas"><Table data={data.consultations} columns={[{ key: "date", header: "Fecha", render: (i) => String(i.consultation_date ?? "-") }, { key: "reason", header: "Motivo", render: (i) => String(i.chief_complaint ?? "-") }, { key: "diagnosis", header: "Diagnostico", render: (i) => String(i.preliminary_diagnosis ?? "-") }]} /></Card></div>;
}

export function PatientClinicInfoPage() {
  const [info, setInfo] = useState<PatientClinicInfo | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalClinicInfo().then(setInfo).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  if (!info) return <Loader />;
  return <div className="space-y-6"><PageHeader title={info.nombre} description="Informacion publica de tu clinica." /><Card><div className="grid gap-4 md:grid-cols-2"><Info label="Telefono" value={info.telefono} /><Info label="Correo" value={info.correo} /><Info label="Direccion" value={info.direccion} /><Info label="Horario" value={`${info.business_start_time} - ${info.business_end_time}`} /><Info label="Citas online" value={info.allow_online_appointments ? "Disponible" : "No disponible"} /><Info label="Cancelaciones" value={info.allow_patient_cancellations ? "Permitidas" : "No permitidas"} /></div></Card></div>;
}
