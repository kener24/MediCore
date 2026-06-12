import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Bell, CalendarClock, FileText, Receipt, User } from "lucide-react";

import { cancelPatientAppointment, getPatientDoctorAvailability, getPatientMedicalRecordSummary, getPatientPortalAppointment, getPatientPortalAppointments, getPatientPortalClinicInfo, getPatientPortalDashboard, getPatientPortalDoctors, getPatientPortalInvoice, getPatientPortalInvoices, getPatientPortalMedicalOrder, getPatientPortalMedicalOrders, getPatientPortalPayments, getPatientPortalPrescription, getPatientPortalPrescriptions, getPatientPortalProfile, getPatientPortalSpecialties, requestPatientAppointment, updatePatientPortalProfile } from "../../api/patientPortalApi";
import { getErrorMessage } from "../../api/axios";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { InvoiceStatusBadge, PaymentMethodBadge } from "../../components/ui/BillingBadges";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { Appointment, AppointmentAvailability } from "../../types/appointment";
import type { Invoice, Payment } from "../../types/billing";
import type { MedicalOrder, Prescription } from "../../types/prescription";
import type { PatientClinicInfo, PatientMedicalRecordSummary, PatientPortalDashboard, PatientPortalProfile } from "../../types/patientPortal";

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
  return <div className="space-y-6"><PageHeader title={`Hola, ${data.patient.nombre_completo}`} description={data.clinic.nombre} /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Proximas citas" value={data.upcoming_appointments.length} icon={<CalendarClock className="h-5 w-5" />} /><StatCard label="Recetas recientes" value={data.recent_prescriptions.length} icon={<FileText className="h-5 w-5" />} /><StatCard label="Facturas pendientes" value={data.pending_invoices.length} icon={<Receipt className="h-5 w-5" />} /><StatCard label="Notificaciones" value={data.unread_notifications} icon={<Bell className="h-5 w-5" />} /></div><div className="grid gap-4 lg:grid-cols-2"><Card title="Proxima actividad">{data.upcoming_appointments.length ? <Table data={data.upcoming_appointments} columns={[{ key: "date", header: "Fecha", render: (i) => i.scheduled_date }, { key: "doctor", header: "Medico", render: appointmentDoctor }, { key: "status", header: "Estado", render: (i) => <AppointmentStatusBadge status={i.status} /> }]} /> : <EmptyState title="Sin citas proximas." description="Puedes solicitar una cita si tu clinica lo permite." />}</Card><Card title="Accesos rapidos"><div className="grid gap-2 sm:grid-cols-2"><Link className="rounded-md border px-4 py-3 text-sm font-semibold" to="/patient/appointments/request">Solicitar cita</Link><Link className="rounded-md border px-4 py-3 text-sm font-semibold" to="/patient/medical-record">Mi expediente</Link><Link className="rounded-md border px-4 py-3 text-sm font-semibold" to="/patient/prescriptions">Mis recetas</Link><Link className="rounded-md border px-4 py-3 text-sm font-semibold" to="/patient/clinic-info">Mi clinica</Link></div></Card></div></div>;
}

export function PatientPortalProfilePage() {
  const [profile, setProfile] = useState<PatientPortalProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalProfile().then(setProfile).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  if (!profile) return <Loader />;
  async function submit(e: FormEvent) { e.preventDefault(); if (!profile) return; try { setProfile(await updatePatientPortalProfile(profile)); toast.success("Perfil actualizado."); } catch (error) { toast.error(getErrorMessage(error)); } }
  const set = (patch: Partial<PatientPortalProfile>) => setProfile({ ...profile, ...patch });
  return <form className="space-y-6" onSubmit={submit}><PageHeader title="Mi perfil" description="Datos personales editables." actions={<Button>Guardar</Button>} /><Card><div className="grid gap-3 md:grid-cols-2"><Info label="Codigo" value={profile.codigo_paciente} /><Info label="Identidad" value={profile.identidad} /><Input label="Telefono" value={profile.telefono} onChange={(v) => set({ telefono: v })} /><Input label="Correo" value={profile.correo} onChange={(v) => set({ correo: v })} /><Input label="Direccion" value={profile.direccion} onChange={(v) => set({ direccion: v })} /><Input label="Ciudad" value={profile.ciudad} onChange={(v) => set({ ciudad: v })} /><Input label="Departamento" value={profile.departamento} onChange={(v) => set({ departamento: v })} /><Input label="Contacto emergencia" value={profile.contacto_emergencia_nombre} onChange={(v) => set({ contacto_emergencia_nombre: v })} /><Input label="Telefono emergencia" value={profile.contacto_emergencia_telefono} onChange={(v) => set({ contacto_emergencia_telefono: v })} /><Input label="Parentesco" value={profile.contacto_emergencia_parentesco} onChange={(v) => set({ contacto_emergencia_parentesco: v })} /></div></Card></form>;
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
  return <div className="space-y-6"><PageHeader title="Mis citas" description="Proximas citas e historial." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/patient/appointments/request">Solicitar cita</Link>} /><Card><Table data={items} columns={[{ key: "date", header: "Fecha", render: (i) => i.scheduled_date }, { key: "doctor", header: "Medico", render: appointmentDoctor }, { key: "reason", header: "Motivo", render: (i) => i.reason }, { key: "status", header: "Estado", render: (i) => <AppointmentStatusBadge status={i.status} /> }, { key: "actions", header: "Acciones", render: (i) => <div className="flex gap-2"><Link className="rounded-md border px-2 py-1 text-xs" to={`/patient/appointments/${i.id}`}>Ver</Link>{!["cancelada", "atendida"].includes(i.status) ? <button className="rounded-md border px-2 py-1 text-xs text-rose-700" onClick={() => setCancelling(i)}>Cancelar</button> : null}</div> }]} /></Card><Modal open={Boolean(cancelling)} title="Cancelar cita" onClose={() => setCancelling(null)} actions={<><ModalCloseButton onClick={() => setCancelling(null)} /><Button form="patient-cancel-form" type="submit" variant="danger">Cancelar</Button></>}><form id="patient-cancel-form" onSubmit={submitCancel}><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} /></form></Modal></div>;
}

export function PatientPortalAppointmentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) getPatientPortalAppointment(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Detalle de cita" description={`${item.scheduled_date} ${item.start_time}`} /><Card><div className="grid gap-4 md:grid-cols-2"><Info label="Medico" value={appointmentDoctor(item)} /><Info label="Motivo" value={item.reason} /><Info label="Estado" value={item.status} /><Info label="Notas" value={item.notes} /></div></Card></div>;
}

export function PatientRequestAppointmentPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [availability, setAvailability] = useState<AppointmentAvailability | null>(null);
  const [form, setForm] = useState({ specialty: "", doctor: "", scheduled_date: "", start_time: "", reason: "" });
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getPatientPortalDoctors(), getPatientPortalSpecialties()]).then(([d, s]) => { setDoctors(d); setSpecialties(s); }).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  async function check() { if (!form.doctor || !form.scheduled_date) return; try { setAvailability(await getPatientDoctorAvailability(form.doctor, form.scheduled_date)); } catch (e) { toast.error(getErrorMessage(e)); } }
  async function submit(e: FormEvent) { e.preventDefault(); try { await requestPatientAppointment(form); toast.success("Solicitud de cita creada."); setForm({ specialty: "", doctor: "", scheduled_date: "", start_time: "", reason: "" }); setAvailability(null); } catch (error) { toast.error(getErrorMessage(error)); } }
  const filteredDoctors = form.specialty ? doctors.filter((d) => String(d.specialty) === form.specialty) : doctors;
  return <form className="space-y-6" onSubmit={submit}><PageHeader title="Solicitar cita" description="Selecciona medico, fecha y horario disponible." actions={<Button>Solicitar</Button>} /><Card><div className="grid gap-3 md:grid-cols-2"><select className="h-11 rounded-md border px-3 text-sm" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value, doctor: "" })}><option value="">Especialidad</option>{specialties.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select><select className="h-11 rounded-md border px-3 text-sm" required value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}><option value="">Medico</option>{filteredDoctors.map((d) => <option key={d.id} value={d.id}>{String(d.user_nombre ?? d.id)}</option>)}</select><input className="h-11 rounded-md border px-3 text-sm" required type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /><Button type="button" variant="outline" onClick={check}>Consultar disponibilidad</Button><select className="h-11 rounded-md border px-3 text-sm md:col-span-2" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}><option value="">Horario</option>{availability?.available_slots.map((slot) => <option key={slot.start_time} value={slot.start_time}>{slot.start_time} - {slot.end_time}</option>)}</select><textarea className="min-h-28 rounded-md border px-3 py-2 text-sm md:col-span-2" required placeholder="Motivo de consulta" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div></Card></form>;
}

export function PatientPortalPrescriptionsPage() { return <SimpleList title="Mis recetas" loader={getPatientPortalPrescriptions} columns={[["Numero", "prescription_number"], ["Fecha", "issue_date"], ["Estado", "status"]]} detailBase="/patient/prescriptions" />; }
export function PatientPortalMedicalOrdersPage() { return <SimpleList title="Mis ordenes medicas" loader={getPatientPortalMedicalOrders} columns={[["Orden", "order_number"], ["Tipo", "order_type"], ["Estado", "status"]]} detailBase="/patient/medical-orders" />; }
export function PatientPortalInvoicesPage() { return <SimpleList title="Mis facturas" loader={getPatientPortalInvoices} columns={[["Factura", "invoice_number"], ["Total", "total_amount"], ["Saldo", "balance_due"]]} detailBase="/patient/invoices" moneyFields={["total_amount", "balance_due"]} />; }
export function PatientPortalPaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalPayments().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  return <div className="space-y-6"><PageHeader title="Mis pagos" description="Pagos aplicados a tus facturas." /><Card><Table data={items} columns={[{ key: "num", header: "Pago", render: (i) => i.payment_number }, { key: "method", header: "Metodo", render: (i) => <PaymentMethodBadge method={i.method} /> }, { key: "amount", header: "Monto", render: (i) => money(i.amount) }, { key: "date", header: "Fecha", render: (i) => i.payment_date }]} /></Card></div>;
}

function SimpleList({ title, loader, columns, detailBase, moneyFields = [] }: { title: string; loader: () => Promise<any[]>; columns: [string, string][]; detailBase: string; moneyFields?: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { loader().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <LoadError message={error} />;
  return <div className="space-y-6"><PageHeader title={title} description="Informacion propia de tu portal." /><Card>{items.length ? <Table data={items} columns={[...columns.map(([header, key]) => ({ key, header, render: (i: any) => moneyFields.includes(key) ? money(i[key]) : String(i[key] ?? "-") })), { key: "actions", header: "Acciones", render: (i: any) => <Link className="rounded-md border px-2 py-1 text-xs" to={`${detailBase}/${i.id}`}>Ver</Link> }]} /> : <EmptyState title="No hay datos." description="Cuando existan registros apareceran aqui." />}</Card></div>;
}

export function PatientPortalPrescriptionDetailsPage() { return <Details loader={getPatientPortalPrescription} titleKey="prescription_number" />; }
export function PatientPortalMedicalOrderDetailsPage() { return <Details loader={getPatientPortalMedicalOrder} titleKey="order_number" />; }
export function PatientPortalInvoiceDetailsPage() { return <InvoiceDetails />; }

function Details({ loader, titleKey }: { loader: (id: string) => Promise<any>; titleKey: string }) {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) loader(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={String(item[titleKey] ?? "Detalle")} description="Detalle del registro." /><Card><pre className="overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(item, null, 2)}</pre></Card></div>;
}

function InvoiceDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) getPatientPortalInvoice(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <LoadError message={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={item.invoice_number} description="Detalle de factura." actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold text-slate-700" to={`/patient/invoices/${item.id}/print`}>Imprimir</Link>} /><Card><div className="grid gap-4 md:grid-cols-4"><Info label="Total" value={money(item.total_amount)} /><Info label="Pagado" value={money(item.paid_amount)} /><Info label="Saldo" value={money(item.balance_due)} /><div><p className="text-xs font-semibold uppercase text-slate-500">Estado</p><div className="mt-1"><InvoiceStatusBadge status={item.status} /></div></div></div></Card></div>;
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
