import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { getClinicSettingsByClinicId, getClinicSettingsSummary, getMyClinicSettings, updateClinicSettingsByClinicId, updateMyClinicSettings, getClinicWorkflowSettings, updateClinicWorkflowSettings } from "../../api/clinicSettingsApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import type { ClinicSettings, ClinicWorkflowSettings } from "../../types/clinicSettings";
import { Building2 } from "lucide-react";

const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function field(label: string, input: ReactNode) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span>{input}</label>;
}

function textInput(value: string | number, onChange: (value: string) => void, type = "text") {
  return <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

function toggle(label: string, checked: boolean, onChange: (value: boolean) => void) {
  return <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"><span>{label}</span><input className="h-5 w-5 rounded border-slate-300 text-brand-600" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function SettingsForm({ mode }: { mode: "my" | "clinic" }) {
  const { id } = useParams();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      setSettings(mode === "clinic" && id ? await getClinicSettingsByClinicId(id) : await getMyClinicSettings());
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    }
  }

  useEffect(() => { load(); }, [id, mode]);
  if (error) return <EmptyState title="No se pudo cargar la configuracion." description={error} />;
  if (!settings) return <Loader />;
  const patch = (data: Partial<ClinicSettings>) => setSettings({ ...settings, ...data });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const saved = mode === "clinic" && id ? await updateClinicSettingsByClinicId(id, settings) : await updateMyClinicSettings(settings);
      setSettings(saved);
      toast.success("Configuracion guardada.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return <form className="space-y-6" onSubmit={submit}>
    <PageHeader title="Configuracion de clinica" description={settings.clinic_nombre ?? "Personalizacion operativa, fiscal y de portal."} actions={<Button isLoading={saving}>Guardar cambios</Button>} />
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="General">
        <div className="grid gap-3 md:grid-cols-2">
          {field("Moneda", textInput(settings.currency, (v) => patch({ currency: v.toUpperCase() })))}
          {field("Pais", textInput(settings.country, (v) => patch({ country: v })))}
          {field("Zona horaria", textInput(settings.timezone, (v) => patch({ timezone: v })))}
          {field("Idioma", textInput(settings.language, (v) => patch({ language: v })))}
          {field("Inicio jornada", textInput(settings.business_start_time, (v) => patch({ business_start_time: v }), "time"))}
          {field("Fin jornada", textInput(settings.business_end_time, (v) => patch({ business_end_time: v }), "time"))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{days.map((day) => <label key={day} className="rounded-md border px-3 py-2 text-sm"><input className="mr-2" type="checkbox" checked={settings.working_days.includes(day)} onChange={(e) => patch({ working_days: e.target.checked ? [...settings.working_days, day] : settings.working_days.filter((item) => item !== day) })} />{day}</label>)}</div>
      </Card>
      <Card title="Branding">
        <div className="grid gap-3 md:grid-cols-2">
          {field("Logo URL", textInput(settings.logo_url, (v) => patch({ logo_url: v })))}
          {field("Color primario", textInput(settings.primary_color, (v) => patch({ primary_color: v }), "color"))}
          {field("Color secundario", textInput(settings.secondary_color, (v) => patch({ secondary_color: v }), "color"))}
          {field("Color acento", textInput(settings.accent_color, (v) => patch({ accent_color: v }), "color"))}
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 p-4" style={{ borderColor: settings.primary_color }}><p className="font-semibold" style={{ color: settings.primary_color }}>Vista previa de marca</p><p className="text-sm text-slate-500">Colores visibles para web y apps moviles.</p></div>
      </Card>
      <Card title="Facturacion y fiscal">
        <div className="grid gap-3 md:grid-cols-2">
          {toggle("Impuesto habilitado", settings.tax_enabled, (v) => patch({ tax_enabled: v }))}
          {field("Tasa impuesto", textInput(settings.default_tax_rate, (v) => patch({ default_tax_rate: v }), "number"))}
          {field("Prefijo factura", textInput(settings.invoice_prefix, (v) => patch({ invoice_prefix: v })))}
          {field("Prefijo paciente", textInput(settings.patient_prefix, (v) => patch({ patient_prefix: v })))}
          {field("Prefijo expediente", textInput(settings.medical_record_prefix, (v) => patch({ medical_record_prefix: v })))}
          {field("Prefijo receta", textInput(settings.prescription_prefix, (v) => patch({ prescription_prefix: v })))}
          {field("Prefijo orden medica", textInput(settings.medical_order_prefix, (v) => patch({ medical_order_prefix: v })))}
          {field("Prefijo compra", textInput(settings.purchase_order_prefix, (v) => patch({ purchase_order_prefix: v })))}
          {field("Nombre fiscal", textInput(settings.fiscal_name, (v) => patch({ fiscal_name: v })))}
          {field("RTN fiscal", textInput(settings.fiscal_rtn, (v) => patch({ fiscal_rtn: v })))}
          {field("Telefono fiscal", textInput(settings.fiscal_phone, (v) => patch({ fiscal_phone: v })))}
          {field("Correo fiscal", textInput(settings.fiscal_email, (v) => patch({ fiscal_email: v }), "email"))}
        </div>
        <textarea className="mt-3 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Pie de factura" value={settings.footer_invoice_text} onChange={(e) => patch({ footer_invoice_text: e.target.value })} />
      </Card>
      <Card title="Citas y portal paciente">
        <div className="grid gap-3">
          {field("Duracion cita minutos", textInput(settings.appointment_duration_minutes, (v) => patch({ appointment_duration_minutes: Number(v) }), "number"))}
          {toggle("Permitir citas en linea", settings.allow_online_appointments, (v) => patch({ allow_online_appointments: v }))}
          {toggle("Permitir cancelaciones de paciente", settings.allow_patient_cancellations, (v) => patch({ allow_patient_cancellations: v }))}
          {field("Limite horas para cancelar", textInput(settings.cancellation_hours_limit, (v) => patch({ cancellation_hours_limit: Number(v) }), "number"))}
          {toggle("Requerir confirmacion", settings.require_appointment_confirmation, (v) => patch({ require_appointment_confirmation: v }))}
          {toggle("Permitir portal paciente", settings.allow_patient_portal, (v) => patch({ allow_patient_portal: v }))}
          {toggle("Paciente ve expediente", settings.allow_patient_medical_record_view, (v) => patch({ allow_patient_medical_record_view: v }))}
          {toggle("Paciente ve recetas", settings.allow_patient_prescription_view, (v) => patch({ allow_patient_prescription_view: v }))}
          {toggle("Paciente ve facturas", settings.allow_patient_invoice_view, (v) => patch({ allow_patient_invoice_view: v }))}
        </div>
      </Card>
    </div>
  </form>;
}

export function ClinicSettingsPage() { return <SettingsForm mode="my" />; }
export function SuperAdminClinicSettingsPage() { return <SettingsForm mode="clinic" />; }

export function ClinicSettingsSummaryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { getClinicSettingsSummary().then(setSummary).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <EmptyState title="No se pudo cargar el resumen." description={error} />;
  if (!summary) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Configuracion de clinicas" description="Resumen global de personalizacion." /><div className="grid gap-4 md:grid-cols-5"><StatCard label="Clinicas" value={summary.total_clinics} icon={<Building2 className="h-5 w-5" />} /><StatCard label="Configuradas" value={summary.configured_clinics} icon={<Building2 className="h-5 w-5" />} /><StatCard label="Pendientes" value={summary.missing_settings} icon={<Building2 className="h-5 w-5" />} /><StatCard label="Portal activo" value={summary.patient_portal_enabled} icon={<Building2 className="h-5 w-5" />} /><StatCard label="Citas online" value={summary.online_appointments_enabled} icon={<Building2 className="h-5 w-5" />} /></div></div>;
}

export function ClinicWorkflowSettingsPage() {
  const [settings, setSettings] = useState<ClinicWorkflowSettings | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClinicWorkflowSettings().then(setSettings).catch((e) => {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    });
  }, []);

  if (error) return <EmptyState title="No se pudo cargar el flujo clinico." description={error} />;
  if (!settings) return <Loader />;

  const currentSettings = settings;
  const patch = (data: Partial<ClinicWorkflowSettings>) => setSettings((prev) => prev ? { ...prev, ...data } : prev);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await updateClinicWorkflowSettings(currentSettings);
      setSettings(saved);
      toast.success("Flujo clinico guardado.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return <form className="space-y-6" onSubmit={submit}>
    <PageHeader title="Flujo clinico" description="Define como pasan los pacientes por recepcion, triaje, medico y caja." actions={<Button isLoading={saving}>Guardar flujo</Button>} />
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Entrada de pacientes">
        <div className="grid gap-3">
          {toggle("Permitir pacientes sin cita", currentSettings.allow_walk_in_patients, (v) => patch({ allow_walk_in_patients: v }))}
          {toggle("Permitir citas", currentSettings.allow_appointments, (v) => patch({ allow_appointments: v }))}
          {toggle("Permitir citas en linea", currentSettings.allow_online_appointments, (v) => patch({ allow_online_appointments: v }))}
          {toggle("Permitir citas presenciales", currentSettings.allow_in_person_appointments, (v) => patch({ allow_in_person_appointments: v }))}
          {toggle("Recepcion puede crear paciente basico", currentSettings.reception_can_create_minimal_patient, (v) => patch({ reception_can_create_minimal_patient: v }))}
        </div>
      </Card>
      <Card title="Triaje y consulta">
        <div className="grid gap-3">
          {toggle("Paciente sin cita pasa por triaje", currentSettings.walk_in_requires_triage, (v) => patch({ walk_in_requires_triage: v }))}
          {toggle("Paciente con cita pasa por triaje", currentSettings.appointment_requires_triage, (v) => patch({ appointment_requires_triage: v, appointment_direct_to_doctor: v ? false : currentSettings.appointment_direct_to_doctor }))}
          {toggle("Paciente con cita va directo al medico", currentSettings.appointment_direct_to_doctor, (v) => patch({ appointment_direct_to_doctor: v, appointment_requires_triage: v ? false : currentSettings.appointment_requires_triage }))}
          {toggle("Medico puede crear paciente", currentSettings.allow_doctor_to_create_patient, (v) => patch({ allow_doctor_to_create_patient: v }))}
          {toggle("Enfermeria edita datos basicos", currentSettings.allow_nurse_to_edit_patient_basic_data, (v) => patch({ allow_nurse_to_edit_patient_basic_data: v }))}
        </div>
      </Card>
      <Card title="Caja y facturacion">
        <div className="grid gap-3">
          {toggle("Recepcion tambien funciona como caja", currentSettings.reception_handles_cashier, (v) => patch({ reception_handles_cashier: v }))}
          {toggle("Cobro antes de consulta", currentSettings.billing_before_consultation, (v) => patch({ billing_before_consultation: v, billing_after_consultation: v ? false : currentSettings.billing_after_consultation }))}
          {toggle("Cobro despues de consulta", currentSettings.billing_after_consultation, (v) => patch({ billing_after_consultation: v, billing_before_consultation: v ? false : currentSettings.billing_before_consultation }))}
          {toggle("Requerir pago antes de consulta", currentSettings.require_payment_before_consultation, (v) => patch({ require_payment_before_consultation: v, allow_consultation_without_payment: v ? false : currentSettings.allow_consultation_without_payment }))}
          {toggle("Permitir consulta sin pago previo", currentSettings.allow_consultation_without_payment, (v) => patch({ allow_consultation_without_payment: v, require_payment_before_consultation: v ? false : currentSettings.require_payment_before_consultation }))}
          {toggle("Enviar a caja al finalizar consulta", currentSettings.auto_send_to_billing_after_consultation, (v) => patch({ auto_send_to_billing_after_consultation: v }))}
          {toggle("Completar visita despues del pago", currentSettings.auto_complete_visit_after_payment, (v) => patch({ auto_complete_visit_after_payment: v }))}
        </div>
      </Card>
      <Card title="Datos minimos">
        <div className="grid gap-3">
          {toggle("Requerir identidad del paciente", currentSettings.require_identity_for_patient, (v) => patch({ require_identity_for_patient: v }))}
          {toggle("Requerir telefono del paciente", currentSettings.require_phone_for_patient, (v) => patch({ require_phone_for_patient: v }))}
        </div>
      </Card>
    </div>
  </form>;
}
