import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, Edit, FilePlus2, FileText, FolderOpen, ReceiptText, Upload } from "lucide-react";

import { getErrorMessage } from "../../api/axios";
import { getAppointments } from "../../api/appointmentsApi";
import { getInvoices } from "../../api/billingApi";
import { getPatientClinicalHistory } from "../../api/medicalRecordsApi";
import { getPatient } from "../../api/patientsApi";
import { AppointmentStatusBadge } from "../../components/ui/AppointmentStatusBadge";
import { BloodTypeBadge } from "../../components/ui/BloodTypeBadge";
import { InvoiceStatusBadge } from "../../components/ui/BillingBadges";
import { Card } from "../../components/ui/Card";
import { GenderBadge } from "../../components/ui/GenderBadge";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { PatientCard } from "../../components/ui/PatientCard";
import type { Appointment } from "../../types/appointment";
import type { Invoice } from "../../types/billing";
import type { ClinicalHistory } from "../../types/medicalRecord";
import type { Patient } from "../../types/patient";
import { formatDate } from "../../utils/formatDate";
import { formatDateOnly, formatTime } from "../appointments/appointmentUtils";

const money = (value?: string | number | null) => `L ${Number(value ?? 0).toFixed(2)}`;

type PatientSummary = {
  appointments: Appointment[];
  invoices: Invoice[];
  history: ClinicalHistory | null;
};

export function PatientDetailsPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary>({ appointments: [], invoices: [], history: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [patientData, appointmentsResult, historyResult, invoicesResult] = await Promise.allSettled([
          getPatient(id),
          getAppointments({ patient: id, ordering: "-scheduled_date" }),
          getPatientClinicalHistory(id),
          getInvoices({ patient: id }),
        ]);
        if (patientData.status === "fulfilled") setPatient(patientData.value);
        else toast.error(getErrorMessage(patientData.reason));
        setSummary({
          appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value : [],
          history: historyResult.status === "fulfilled" ? historyResult.value : null,
          invoices: invoicesResult.status === "fulfilled" ? invoicesResult.value : [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (!patient) return null;
  return <PatientDetailsContent patient={patient} summary={summary} />;
}

const emptySummary: PatientSummary = { appointments: [], invoices: [], history: null };

export function PatientDetailsContent({ patient, summary = emptySummary }: { patient: Patient; summary?: PatientSummary }) {
  const age = patient.fecha_nacimiento ? new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear() : null;
  const recentAppointments = summary.appointments.slice(0, 3);
  const recentInvoices = summary.invoices.slice(0, 3);
  const consultationsCount = summary.history?.consultations?.length ?? 0;
  const prescriptionsCount = summary.history?.prescriptions?.length ?? 0;
  const pendingBalance = summary.invoices.reduce((total, invoice) => total + Number(invoice.balance_due ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.nombre_completo}
        description="Detalle administrativo, clinico y financiero del paciente."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/clinic/patients/${patient.id}/edit`}><Edit className="h-4 w-4" />Editar</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700" to={`/clinic/appointments/new?patient=${patient.id}`}><CalendarClock className="h-4 w-4" />Nueva cita</Link>
          </div>
        }
      />
      <PatientCard patient={patient} />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Citas" value={summary.appointments.length} helper="Registradas" />
        <MetricCard label="Consultas" value={consultationsCount} helper="En historial" />
        <MetricCard label="Recetas" value={prescriptionsCount} helper="Emitidas" />
        <MetricCard label="Saldo" value={money(pendingBalance)} helper="Pendiente" />
      </div>
      <Card title="Informacion personal">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Identidad" value={patient.identidad || "Sin identidad"} />
          <Info label="Fecha nacimiento" value={patient.fecha_nacimiento || "Sin fecha"} />
          <Info label="Edad" value={age ? `${age} años` : "Sin dato"} />
          <div><p className="text-xs font-semibold uppercase text-slate-500">Genero</p><div className="mt-1"><GenderBadge gender={patient.genero} /></div></div>
          <div><p className="text-xs font-semibold uppercase text-slate-500">Tipo sangre</p><div className="mt-1"><BloodTypeBadge bloodType={patient.tipo_sangre} /></div></div>
          <Info label="Creacion" value={formatDate(patient.creado_en)} />
        </div>
      </Card>
      <Card title="Contacto">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Telefono" value={patient.telefono || "Sin telefono"} />
          <Info label="Correo" value={patient.correo || "Sin correo"} />
          <Info label="Direccion" value={[patient.direccion, patient.ciudad, patient.departamento, patient.pais].filter(Boolean).join(", ") || "Sin direccion"} />
          <Info label="Emergencia" value={`${patient.contacto_emergencia_nombre || "Sin contacto"} ${patient.contacto_emergencia_telefono || ""} ${patient.contacto_emergencia_parentesco || ""}`} />
        </div>
      </Card>
      <Card title="Salud basica">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Alergias" value={patient.alergias || "Sin registro"} />
          <Info label="Enfermedades cronicas" value={patient.enfermedades_cronicas || "Sin registro"} />
          <Info label="Observaciones" value={patient.observaciones || "Sin observaciones"} />
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Citas recientes" actions={<Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/clinic/appointments?patient=${patient.id}`}>Ver todas</Link>}>
          {recentAppointments.length ? (
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <Link key={appointment.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 transition hover:border-brand-200 hover:bg-brand-50" to={`/clinic/appointments/${appointment.id}`}>
                  <div>
                    <p className="font-semibold text-slate-900">{formatDateOnly(appointment.scheduled_date)} - {formatTime(appointment.start_time)}</p>
                    <p className="text-sm text-slate-500">{doctorLabel(appointment)} - {appointment.reason || "Sin motivo"}</p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </Link>
              ))}
            </div>
          ) : <InlineEmpty title="Sin citas registradas" action="Crear primera cita" to={`/clinic/appointments/new?patient=${patient.id}`} />}
        </Card>
        <Card title="Expediente clinico" actions={<Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/clinic/patients/${patient.id}/clinical-history`}>Abrir historial</Link>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction icon={<FolderOpen className="h-5 w-5" />} title="Historial clinico" text={`${consultationsCount} consultas registradas`} to={`/clinic/patients/${patient.id}/clinical-history`} />
            <QuickAction icon={<FileText className="h-5 w-5" />} title="Expediente base" text={summary.history?.medical_record?.record_number || "Crear o revisar expediente"} to={summary.history?.medical_record ? `/clinic/medical-records/${summary.history.medical_record.id}` : `/clinic/patients/${patient.id}/clinical-history`} />
            <QuickAction icon={<FilePlus2 className="h-5 w-5" />} title="Nueva consulta" text="Iniciar atencion clinica" to={`/clinic/consultations/new?patient=${patient.id}`} />
            <QuickAction icon={<Upload className="h-5 w-5" />} title="Documentos" text="Subir o consultar archivos" to={`/clinic/patients/${patient.id}/documents`} />
          </div>
        </Card>
        <Card title="Facturacion" actions={<Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/clinic/billing/invoices?patient=${patient.id}`}>Ver facturas</Link>}>
          {recentInvoices.length ? (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <Link key={invoice.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 transition hover:border-brand-200 hover:bg-brand-50" to={`/clinic/billing/invoices/${invoice.id}`}>
                  <div>
                    <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500">Total {money(invoice.total_amount)} - Saldo {money(invoice.balance_due)}</p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </Link>
              ))}
            </div>
          ) : <InlineEmpty title="Sin facturas registradas" action="Crear factura" to={`/clinic/billing/invoices/new?patient=${patient.id}`} />}
        </Card>
        <Card title="Accesos rapidos">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction icon={<ReceiptText className="h-5 w-5" />} title="Nueva factura" text="Cobrar servicios o consumos" to={`/clinic/billing/invoices/new?patient=${patient.id}`} />
            <QuickAction icon={<CalendarClock className="h-5 w-5" />} title="Agenda" text="Revisar calendario de la clinica" to="/clinic/calendar" />
            <QuickAction icon={<FileText className="h-5 w-5" />} title="Recetas" text={`${prescriptionsCount} recetas registradas`} to={`/clinic/patients/${patient.id}/clinical-history`} />
            <QuickAction icon={<Upload className="h-5 w-5" />} title="Subir documento" text="Adjuntar archivos al paciente" to={`/clinic/patients/${patient.id}/documents`} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-900">{value}</p></div>;
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>;
}

function InlineEmpty({ title, action, to }: { title: string; action: string; to: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-900">{title}</p><Link className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline" to={to}>{action}</Link></div>;
}

function QuickAction({ icon, title, text, to }: { icon: ReactNode; title: string; text: string; to: string }) {
  return (
    <Link className="flex gap-3 rounded-md border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50" to={to}>
      <span className="mt-0.5 text-brand-700">{icon}</span>
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm text-slate-500">{text}</span>
      </span>
    </Link>
  );
}

function doctorLabel(appointment: Appointment) {
  const doctorName = appointment.doctor_name || (appointment as Appointment & { doctor_nombre?: string }).doctor_nombre;
  return doctorName || "Medico sin asignar";
}
