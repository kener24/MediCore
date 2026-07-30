import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bed,
  ClipboardList,
  DoorOpen,
  HeartPulse,
  NotebookPen,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import {
  acknowledgeMedicalInstruction,
  assignHospitalBed,
  administerMedication,
  cancelHospitalization,
  changeHospitalBed,
  createHospitalBed,
  createHospitalEvent,
  createMedicalEvolution,
  createMedicalInstruction,
  createHospitalConsumption,
  createHospitalRoom,
  createHospitalVitalSigns,
  createHospitalization,
  createNursingNote,
  createNursingRound,
  createTreatmentPlan,
  delayMedication,
  dischargeHospitalization,
  requestHospitalDischarge,
  getDischargeSummaries,
  saveDischargeSummary,
  signDischargeSummary,
  getHospitalConsumptions,
  getHospitalInvoice,
  generateHospitalInvoice,
  getAvailableHospitalBeds,
  getHospitalBeds,
  getHospitalRooms,
  getHospitalization,
  getHospitalizationDashboard,
  getHospitalTimeline,
  getHospitalizations,
  getMedicalEvolutions,
  getMedicalInstructions,
  getMedicationAdministrations,
  getNursingRounds,
  getTreatmentPlans,
  omitMedication,
  refuseMedication,
  unavailableMedication,
  reverseMedication,
  signMedicalEvolution,
  changeMedicalInstructionStatus,
  updateHospitalBed,
  updateHospitalRoom,
} from "../../api/hospitalizationApi";
import { getInventoryItems } from "../../api/inventoryApi";
import { getDoctors } from "../../api/doctorsApi";
import { getPatients } from "../../api/patientsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import type { DoctorProfile } from "../../types/doctor";
import type {
  HospitalBed,
  HospitalRoom,
  HospitalTimelineEntry,
  Hospitalization,
  MedicalEvolution,
  MedicalInstruction,
  MedicationAdministration,
  DischargeSummary,
  HospitalConsumption,
  NursingRound,
  TreatmentPlan,
} from "../../types/hospitalization";
import type { InventoryItem } from "../../types/inventory";
import type { Invoice } from "../../types/billing";
import type { Patient } from "../../types/patient";
import { cleanDecimal, onlyDigits } from "../../utils/inputSanitizers";

const statusLabel: Record<string, string> = {
  active: "Activo",
  observation: "Observación",
  transferred: "Trasladado",
  discharged: "Alta",
  cancelled: "Cancelado",
  pending_admission: "Pendiente de ingreso",
  discharge_pending: "Alta pendiente",
  pending: "Pendiente",
  scheduled: "Programada",
  due: "Por administrar",
  administered: "Administrado",
  omitted: "Omitido",
  refused: "Rechazado",
  unavailable: "No disponible",
  delayed: "Retrasado",
  reversed: "Revertido",
};

const bedStatusLabel: Record<string, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  blocked: "Bloqueada",
};

function StatusPill({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
      {statusLabel[value] || bedStatusLabel[value] || value}
    </span>
  );
}

function isClosedAdmission(status: string) {
  return ["discharged", "cancelled"].includes(status);
}

function requireTrimmed(value: string, message: string) {
  if (!value.trim()) {
    toast.error(message);
    return false;
  }
  return true;
}

export function HospitalizationDashboardPage() {
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getHospitalizationDashboard>
  > | null>(null);
  const [admissions, setAdmissions] = useState<Hospitalization[]>([]);
  useEffect(() => {
    Promise.all([
      getHospitalizationDashboard(),
      getHospitalizations({ active: "true" }),
    ])
      .then(([dashboard, active]) => {
        setStats(dashboard);
        setAdmissions(active);
      })
      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);
  if (!stats) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitalización"
        description="Pacientes internados, camas y seguimiento básico de enfermería."
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white"
            to="/clinic/hospitalization/new"
          >
            Nuevo internamiento
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Internados"
          value={stats.active_patients}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Observación"
          value={stats.observation_patients}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Camas disponibles"
          value={stats.available_beds}
          icon={<Bed className="h-5 w-5" />}
        />
        <StatCard
          label="Notas urgentes"
          value={stats.urgent_notes}
          icon={<NotebookPen className="h-5 w-5" />}
        />
      </div>
      <HospitalizationTable admissions={admissions} />
    </div>
  );
}

function HospitalizationTable({
  admissions,
}: {
  admissions: Hospitalization[];
}) {
  return (
    <Card title="Pacientes internados">
      {admissions.length ? (
        <Table
          data={admissions}
          columns={[
            {
              key: "patient",
              header: "Paciente",
              render: (row) => row.patient_name,
            },
            {
              key: "bed",
              header: "Cama",
              render: (row) => row.current_bed_code || "Sin cama",
            },
            {
              key: "doctor",
              header: "Médico",
              render: (row) => row.responsible_doctor_name || "-",
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => <StatusPill value={row.status} />,
            },
            {
              key: "date",
              header: "Ingreso",
              render: (row) =>
                new Date(row.admission_datetime).toLocaleString("es-HN"),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <Link
                  className="rounded-md border px-3 py-1 text-xs font-semibold"
                  to={`/clinic/hospitalization/admissions/${row.id}`}
                >
                  Ver
                </Link>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No hay pacientes internados."
          description="Los internamientos activos aparecerán aquí."
        />
      )}
    </Card>
  );
}

export function HospitalizedPatientsPage() {
  const [admissions, setAdmissions] = useState<Hospitalization[]>([]);
  useEffect(() => {
    getHospitalizations({ active: "true" })
      .then(setAdmissions)
      .catch((e) => toast.error(getErrorMessage(e)));
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes internados"
        description="Control actual de pacientes hospitalizados."
      />
      <HospitalizationTable admissions={admissions} />
    </div>
  );
}

export function HospitalizationFormPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [form, setForm] = useState({
    patient: "",
    responsible_doctor: "",
    bed: "",
    admission_source: "reception",
    status: "pending_admission",
    reason: "",
    diagnosis_at_admission: "",
    expected_discharge_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    Promise.all([
      getPatients({ is_active: "true" }),
      getDoctors({ is_active: "true" }),
      getAvailableHospitalBeds(),
    ])
      .then(([p, d, b]) => {
        setPatients(p);
        setDoctors(d);
        setBeds(b);
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.patient) return toast.error("Selecciona un paciente.");
    if (
      !requireTrimmed(form.reason, "El motivo de internamiento es obligatorio.")
    )
      return;
    try {
      setSubmitting(true);
      const created = await createHospitalization(
        {
          patient: Number(form.patient),
          responsible_doctor: form.responsible_doctor
            ? Number(form.responsible_doctor)
            : null,
          bed: form.bed ? Number(form.bed) : null,
          admission_source: form.admission_source,
          status: form.status,
          reason: form.reason.trim(),
          diagnosis_at_admission: form.diagnosis_at_admission.trim(),
          expected_discharge_date: form.expected_discharge_date || null,
        },
        idempotencyKey,
      );
      toast.success("Internamiento creado correctamente.");
      navigate(`/clinic/hospitalization/admissions/${created.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSubmitting(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo internamiento"
        description="Asigna paciente, médico responsable y cama si aplica."
      />
      <Card>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-11 rounded-md border px-3 text-sm"
              required
              value={form.patient}
              onChange={(e) => setForm({ ...form, patient: e.target.value })}
            >
              <option value="">Paciente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_completo} | {p.identidad || p.codigo_paciente}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border px-3 text-sm"
              value={form.responsible_doctor}
              onChange={(e) =>
                setForm({ ...form, responsible_doctor: e.target.value })
              }
            >
              <option value="">Médico responsable</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user_nombre}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border px-3 text-sm"
              value={form.bed}
              onChange={(e) => setForm({ ...form, bed: e.target.value })}
            >
              <option value="">Sin cama asignada</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bed_code} · {b.room_name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border px-3 text-sm"
              value={form.admission_source}
              onChange={(e) =>
                setForm({ ...form, admission_source: e.target.value })
              }
            >
              <option value="reception">Recepción</option>
              <option value="consultation">Consulta</option>
              <option value="emergency">Emergencia</option>
              <option value="transfer">Traslado</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <input
            className="h-11 rounded-md border px-3 text-sm"
            min={new Date().toISOString().slice(0, 10)}
            type="date"
            value={form.expected_discharge_date}
            onChange={(e) =>
              setForm({ ...form, expected_discharge_date: e.target.value })
            }
          />
          <textarea
            className="min-h-24 rounded-md border px-3 py-2 text-sm"
            required
            placeholder="Motivo de internamiento"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <textarea
            className="min-h-24 rounded-md border px-3 py-2 text-sm"
            placeholder="Diagnóstico al ingreso"
            value={form.diagnosis_at_admission}
            onChange={(e) =>
              setForm({ ...form, diagnosis_at_admission: e.target.value })
            }
          />
          <Button isLoading={submitting} type="submit">
            Crear internamiento
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function HospitalizationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const role =
    (typeof user?.role === "object" ? user.role.nombre : user?.role_nombre) ||
    "";
  const canManageAdmission = ["admin", "recepcionista"].includes(role);
  const canWriteNursing = role === "enfermera";
  const canWriteMedical = role === "medico";
  const canViewClinical = ["admin", "medico", "enfermera"].includes(role);
  const canManageDischarge = ["admin", "medico"].includes(role);
  const canManageFinancial = ["admin", "recepcionista"].includes(role);
  const [admission, setAdmission] = useState<Hospitalization | null>(null);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [rounds, setRounds] = useState<NursingRound[]>([]);
  const [medications, setMedications] = useState<MedicationAdministration[]>(
    [],
  );
  const [evolutions, setEvolutions] = useState<MedicalEvolution[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [instructions, setInstructions] = useState<MedicalInstruction[]>([]);
  const [timeline, setTimeline] = useState<HospitalTimelineEntry[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [summaries, setSummaries] = useState<DischargeSummary[]>([]);
  const [consumptions, setConsumptions] = useState<HospitalConsumption[]>([]);
  const [hospitalInvoice, setHospitalInvoice] = useState<Invoice | null>(null);
  const [loadError, setLoadError] = useState("");
  async function load() {
    if (!id) return;
    setLoadError("");
    const [detail, availableBeds] = await Promise.all([
      getHospitalization(id),
      canManageAdmission ? getAvailableHospitalBeds() : Promise.resolve([]),
    ]);
    setAdmission(detail);
    setBeds(availableBeds);
    if (canViewClinical) {
      const [
        nursingRounds,
        medicationRows,
        evolutionRows,
        planRows,
        instructionRows,
        timelineRows,
        summaryRows,
        consumptionRows,
        inventoryRows,
      ] = await Promise.all([
        getNursingRounds(id),
        getMedicationAdministrations(id),
        getMedicalEvolutions(id),
        getTreatmentPlans(id),
        getMedicalInstructions(id),
        getHospitalTimeline(id),
        getDischargeSummaries(id),
        getHospitalConsumptions(id),
        getInventoryItems({ active: "true" }),
      ]);
      setRounds(nursingRounds);
      setMedications(medicationRows);
      setEvolutions(evolutionRows);
      setPlans(planRows);
      setInstructions(instructionRows);
      setTimeline(timelineRows);
      setSummaries(summaryRows);
      setConsumptions(consumptionRows);
      setInventoryItems(inventoryRows);
    }
    if (canManageFinancial) {
      const invoiceResult = await getHospitalInvoice(id);
      setHospitalInvoice("invoice" in invoiceResult ? null : invoiceResult);
    }
  }
  useEffect(() => {
    load().catch((e) => {
      const message = getErrorMessage(e);
      setLoadError(message);
      toast.error(message);
    });
  }, [id, role]);
  if (!admission && !loadError) return <Loader />;
  if (!admission)
    return (
      <Card>
        <EmptyState
          title="No se pudo cargar el internamiento."
          description={loadError}
        />
        <div className="mt-4 flex justify-center">
          <Button type="button" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title={admission.patient_name}
        description={`Internamiento ${statusLabel[admission.status] || admission.status}`}
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold"
            to="/clinic/hospitalization/admissions"
          >
            Volver
          </Link>
        }
      />
      <Card title="Datos del internamiento">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p>
            <b>Cama:</b> {admission.current_bed_code || "Sin cama"}
          </p>
          <p>
            <b>Médico:</b> {admission.responsible_doctor_name || "-"}
          </p>
          <p>
            <b>Ingreso:</b>{" "}
            {new Date(admission.admission_datetime).toLocaleString("es-HN")}
          </p>
          <p className="md:col-span-3">
            <b>Motivo:</b> {admission.reason}
          </p>
          {canViewClinical ? (
            <>
              <p className="md:col-span-3">
                <b>Alergias:</b>{" "}
                {admission.patient_allergies || "No registradas"}
              </p>
              <p className="md:col-span-3">
                <b>Antecedentes cronicos:</b>{" "}
                {admission.patient_chronic_diseases || "No registrados"}
              </p>
            </>
          ) : null}
          <p className="md:col-span-3">
            <b>Diagnóstico:</b> {admission.diagnosis_at_admission || "-"}
          </p>
        </div>
      </Card>
      {!isClosedAdmission(admission.status) && canManageAdmission ? (
        <HospitalizationActions
          admission={admission}
          beds={beds}
          onSaved={load}
        />
      ) : null}
      {canViewClinical ? (
        <ClinicalCareSections
          admission={admission}
          canWriteMedical={canWriteMedical}
          canWriteNursing={canWriteNursing}
          evolutions={evolutions}
          instructions={instructions}
          onSaved={load}
          plans={plans}
          timeline={timeline}
          inventoryItems={inventoryItems}
        />
      ) : null}
      {canManageDischarge || canManageFinancial ? (
        <DischargeWorkflowSection admission={admission} role={role} summaries={summaries} invoice={hospitalInvoice} onSaved={load} />
      ) : null}
      {canWriteNursing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <VitalSignsSection admission={admission} onSaved={load} />
          <NursingNotesSection admission={admission} onSaved={load} />
        </div>
      ) : null}
      {["admin", "enfermera"].includes(role) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <NursingRoundsSection
            admission={admission}
            rounds={rounds}
            onSaved={load}
          />
          <MedicationAdministrationsSection
            admission={admission}
            medications={medications}
            inventoryItems={inventoryItems}
            consumptions={consumptions}
            canWrite={canWriteNursing}
            canReverse={role === "admin"}
            onSaved={load}
          />
        </div>
      ) : null}
    </div>
  );
}

function ClinicalCareSections({
  admission,
  canWriteMedical,
  canWriteNursing,
  evolutions,
  instructions,
  onSaved,
  plans,
  timeline,
  inventoryItems,
}: {
  admission: Hospitalization;
  canWriteMedical: boolean;
  canWriteNursing: boolean;
  evolutions: MedicalEvolution[];
  instructions: MedicalInstruction[];
  onSaved: () => Promise<void>;
  plans: TreatmentPlan[];
  timeline: HospitalTimelineEntry[];
  inventoryItems: InventoryItem[];
}) {
  const [evolution, setEvolution] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [treatment, setTreatment] = useState({
    goals: "",
    treatment: "",
    monitoring: "",
    precautions: "",
    change_reason: "",
  });
  const [instruction, setInstruction] = useState({
    instruction_type: "other",
    priority: "routine",
    title: "",
    details: "",
    inventory_item: "",
    dose: "",
    dose_unit: "mg",
    route: "oral",
    interval_hours: "8",
    inventory_quantity: "1",
    effective_until: "",
    as_needed: false,
    allergy_override_reason: "",
  });
  const [event, setEvent] = useState({
    event_type: "clinical_event",
    severity: "info",
    description: "",
  });
  const [savingAction, setSavingAction] = useState("");

  async function run(
    key: string,
    action: () => Promise<unknown>,
    message: string,
  ) {
    if (savingAction) return;
    setSavingAction(key);
    try {
      await action();
      toast.success(message);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingAction("");
    }
  }

  async function saveEvolution(e: FormEvent) {
    e.preventDefault();
    if (!evolution.assessment.trim() || !evolution.plan.trim())
      return toast.error("La evaluacion y el plan son obligatorios.");
    await run(
      "evolution",
      async () => {
        await createMedicalEvolution(admission.id, evolution);
        setEvolution({
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
        });
      },
      "Evolucion guardada como borrador.",
    );
  }

  async function savePlan(e: FormEvent) {
    e.preventDefault();
    if (!treatment.treatment.trim())
      return toast.error("Describe el tratamiento.");
    if (
      plans.some((plan) => plan.status === "active") &&
      !treatment.change_reason.trim()
    )
      return toast.error(
        "Indica el motivo del cambio para crear una nueva version.",
      );
    await run(
      "plan",
      async () => {
        await createTreatmentPlan(admission.id, treatment);
        setTreatment({
          goals: "",
          treatment: "",
          monitoring: "",
          precautions: "",
          change_reason: "",
        });
      },
      "Plan de tratamiento actualizado.",
    );
  }

  async function saveInstruction(e: FormEvent) {
    e.preventDefault();
    if (!instruction.title.trim() || instruction.details.trim().length < 5)
      return toast.error("Completa el titulo y el detalle de la indicacion.");
    if (instruction.instruction_type === "medication" && (!instruction.inventory_item || !instruction.dose || !instruction.dose_unit || !instruction.route))
      return toast.error("Selecciona medicamento y completa dosis, unidad y via.");
    await run(
      "instruction",
      async () => {
        await createMedicalInstruction(admission.id, {
          ...instruction,
          inventory_item: instruction.inventory_item ? Number(instruction.inventory_item) : null,
          dose: instruction.dose || null,
          interval_hours: instruction.as_needed ? null : Number(instruction.interval_hours),
          inventory_quantity: instruction.inventory_quantity,
          effective_until: instruction.effective_until || null,
        });
        setInstruction({
          instruction_type: "other",
          priority: "routine",
          title: "",
          details: "",
          inventory_item: "",
          dose: "",
          dose_unit: "mg",
          route: "oral",
          interval_hours: "8",
          inventory_quantity: "1",
          effective_until: "",
          as_needed: false,
          allergy_override_reason: "",
        });
      },
      "Indicacion medica creada.",
    );
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    if (event.description.trim().length < 5)
      return toast.error("Describe el evento clinico.");
    await run(
      "event",
      async () => {
        await createHospitalEvent(admission.id, event);
        setEvent({
          event_type: "clinical_event",
          severity: "info",
          description: "",
        });
      },
      "Evento clinico registrado.",
    );
  }

  async function suspendInstruction(item: MedicalInstruction) {
    const reason =
      window.prompt("Motivo obligatorio de suspensión")?.trim() || "";
    if (!reason) return toast.error("El motivo de suspensión es obligatorio.");
    await run(
      `suspend-${item.id}`,
      () => changeMedicalInstructionStatus(item.id, "suspend", reason),
      "Indicación suspendida con trazabilidad.",
    );
  }

  return (
    <div className="space-y-4">
      {canWriteMedical && !isClosedAdmission(admission.status) ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card title="Nueva evolucion medica">
            <form className="grid gap-2" onSubmit={saveEvolution}>
              <textarea
                className="min-h-16 rounded-md border p-2 text-sm"
                placeholder="Subjetivo"
                value={evolution.subjective}
                onChange={(e) =>
                  setEvolution({ ...evolution, subjective: e.target.value })
                }
              />
              <textarea
                className="min-h-16 rounded-md border p-2 text-sm"
                placeholder="Objetivo"
                value={evolution.objective}
                onChange={(e) =>
                  setEvolution({ ...evolution, objective: e.target.value })
                }
              />
              <textarea
                className="min-h-16 rounded-md border p-2 text-sm"
                required
                placeholder="Evaluacion"
                value={evolution.assessment}
                onChange={(e) =>
                  setEvolution({ ...evolution, assessment: e.target.value })
                }
              />
              <textarea
                className="min-h-16 rounded-md border p-2 text-sm"
                required
                placeholder="Plan"
                value={evolution.plan}
                onChange={(e) =>
                  setEvolution({ ...evolution, plan: e.target.value })
                }
              />
              <Button isLoading={savingAction === "evolution"} type="submit">
                Guardar borrador
              </Button>
            </form>
          </Card>
          <Card title="Plan de tratamiento">
            <form className="grid gap-2" onSubmit={savePlan}>
              <input
                className="h-10 rounded-md border px-3 text-sm"
                placeholder="Objetivos"
                value={treatment.goals}
                onChange={(e) =>
                  setTreatment({ ...treatment, goals: e.target.value })
                }
              />
              <textarea
                className="min-h-20 rounded-md border p-2 text-sm"
                required
                placeholder="Tratamiento"
                value={treatment.treatment}
                onChange={(e) =>
                  setTreatment({ ...treatment, treatment: e.target.value })
                }
              />
              <input
                className="h-10 rounded-md border px-3 text-sm"
                placeholder="Monitoreo"
                value={treatment.monitoring}
                onChange={(e) =>
                  setTreatment({ ...treatment, monitoring: e.target.value })
                }
              />
              <input
                className="h-10 rounded-md border px-3 text-sm"
                placeholder="Precauciones"
                value={treatment.precautions}
                onChange={(e) =>
                  setTreatment({ ...treatment, precautions: e.target.value })
                }
              />
              <input
                className="h-10 rounded-md border px-3 text-sm"
                placeholder="Motivo del cambio"
                value={treatment.change_reason}
                onChange={(e) =>
                  setTreatment({ ...treatment, change_reason: e.target.value })
                }
              />
              <Button isLoading={savingAction === "plan"} type="submit">
                Crear nueva version
              </Button>
            </form>
          </Card>
          <Card title="Indicacion medica">
            <form className="grid gap-2" onSubmit={saveInstruction}>
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={instruction.instruction_type}
                onChange={(e) =>
                  setInstruction({
                    ...instruction,
                    instruction_type: e.target.value,
                  })
                }
              >
                <option value="other">Otra</option>
                <option value="medication">Medicamento</option>
                <option value="vital_signs">Signos vitales</option>
                <option value="diet">Dieta</option>
                <option value="activity">Actividad</option>
                <option value="procedure">Procedimiento</option>
              </select>
              {instruction.instruction_type === "medication" ? (
                <>
                  <select className="h-10 rounded-md border px-3 text-sm" required value={instruction.inventory_item} onChange={(e) => {
                    const selected = inventoryItems.find((item) => item.id === Number(e.target.value));
                    setInstruction({ ...instruction, inventory_item: e.target.value, title: selected?.name || instruction.title });
                  }}>
                    <option value="">Medicamento de inventario</option>
                    {inventoryItems.filter((item) => item.item_type === "medicamento").map((item) => <option key={item.id} value={item.id}>{item.name} · Stock {item.stock_current}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder="Dosis" value={instruction.dose} onChange={(e) => setInstruction({ ...instruction, dose: cleanDecimal(e.target.value) })} />
                    <input className="h-10 rounded-md border px-3 text-sm" placeholder="Unidad (mg, ml)" value={instruction.dose_unit} onChange={(e) => setInstruction({ ...instruction, dose_unit: e.target.value })} />
                    <select className="h-10 rounded-md border px-3 text-sm" value={instruction.route} onChange={(e) => setInstruction({ ...instruction, route: e.target.value })}>
                      {Object.entries(medicationRouteLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input className="h-10 rounded-md border px-3 text-sm" inputMode="numeric" placeholder="Cada N horas" disabled={instruction.as_needed} value={instruction.interval_hours} onChange={(e) => setInstruction({ ...instruction, interval_hours: onlyDigits(e.target.value) })} />
                    <input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder="Unidades de inventario por dosis" value={instruction.inventory_quantity} onChange={(e) => setInstruction({ ...instruction, inventory_quantity: cleanDecimal(e.target.value) })} />
                    <input className="h-10 rounded-md border px-3 text-sm" type="datetime-local" value={instruction.effective_until} onChange={(e) => setInstruction({ ...instruction, effective_until: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={instruction.as_needed} onChange={(e) => setInstruction({ ...instruction, as_needed: e.target.checked })} /> Administrar cuando sea necesario</label>
                  {admission.patient_allergies ? <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"><b>Alergias:</b> {admission.patient_allergies}</div> : null}
                  <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Justificacion si existe alerta de alergia" value={instruction.allergy_override_reason} onChange={(e) => setInstruction({ ...instruction, allergy_override_reason: e.target.value })} />
                </>
              ) : null}
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={instruction.priority}
                onChange={(e) =>
                  setInstruction({ ...instruction, priority: e.target.value })
                }
              >
                <option value="routine">Rutina</option>
                <option value="urgent">Urgente</option>
                <option value="stat">Inmediata</option>
              </select>
              <input
                className="h-10 rounded-md border px-3 text-sm"
                required
                placeholder="Titulo"
                value={instruction.title}
                onChange={(e) =>
                  setInstruction({ ...instruction, title: e.target.value })
                }
              />
              <textarea
                className="min-h-24 rounded-md border p-2 text-sm"
                required
                placeholder="Detalle"
                value={instruction.details}
                onChange={(e) =>
                  setInstruction({ ...instruction, details: e.target.value })
                }
              />
              <Button isLoading={savingAction === "instruction"} type="submit">
                Crear indicacion
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Evoluciones medicas">
          <div className="space-y-2">
            {evolutions.length ? (
              evolutions.map((item) => (
                <div className="rounded-md border p-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>
                      {item.status === "correction"
                        ? "Correccion firmada"
                        : item.status === "signed"
                          ? "Firmada"
                          : "Borrador"}
                    </b>
                    <span>{item.doctor_name}</span>
                  </div>
                  <p>
                    {item.assessment || item.progress_notes || "Sin evaluacion"}
                  </p>
                  <p className="text-slate-600">Plan: {item.plan || "-"}</p>
                  {canWriteMedical && item.status === "draft" ? (
                    <Button
                      className="mt-2"
                      isLoading={savingAction === `sign-${item.id}`}
                      type="button"
                      onClick={() =>
                        void run(
                          `sign-${item.id}`,
                          () => signMedicalEvolution(item.id),
                          "Evolucion firmada; ya no puede modificarse.",
                        )
                      }
                    >
                      Firmar evolucion
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState title="Sin evoluciones medicas." />
            )}
          </div>
        </Card>
        <Card title="Indicaciones activas">
          <div className="space-y-2">
            {instructions.length ? (
              instructions.map((item) => (
                <div className="rounded-md border p-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>{item.title}</b>
                    <StatusPill value={item.status} />
                  </div>
                  <p>{item.details}</p>
                  <p className="text-xs text-slate-500">
                    Prioridad: {item.priority} | Medico:{" "}
                    {item.doctor_name || "-"}
                  </p>
                  {canWriteNursing && item.status === "active" ? (
                    <Button
                      className="mt-2"
                      type="button"
                      onClick={() =>
                        void run(
                          `ack-${item.id}`,
                          () => acknowledgeMedicalInstruction(item.id),
                          "Indicacion recibida.",
                        )
                      }
                    >
                      Confirmar recepcion
                    </Button>
                  ) : null}
                  {canWriteNursing &&
                  ["acknowledged", "in_progress"].includes(item.status) ? (
                    <Button
                      className="mt-2"
                      type="button"
                      onClick={() =>
                        void run(
                          `status-${item.id}`,
                          () =>
                            changeMedicalInstructionStatus(
                              item.id,
                              item.status === "acknowledged"
                                ? "start"
                                : "complete",
                            ),
                          item.status === "acknowledged"
                            ? "Indicacion iniciada."
                            : "Indicacion completada.",
                        )
                      }
                    >
                      {item.status === "acknowledged" ? "Iniciar" : "Completar"}
                    </Button>
                  ) : null}
                  {canWriteMedical &&
                  ["active", "acknowledged", "in_progress"].includes(
                    item.status,
                  ) ? (
                    <Button
                      className="mt-2"
                      isLoading={savingAction === `suspend-${item.id}`}
                      type="button"
                      variant="danger"
                      onClick={() => void suspendInstruction(item)}
                    >
                      Suspender
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState title="Sin indicaciones activas." />
            )}
          </div>
        </Card>
      </div>
      {(canWriteMedical || canWriteNursing) &&
      !isClosedAdmission(admission.status) ? (
        <Card title="Registrar evento clinico">
          <form
            className="grid gap-2 md:grid-cols-[180px_150px_1fr_auto]"
            onSubmit={saveEvent}
          >
            <input
              className="h-10 rounded-md border px-3 text-sm"
              value={event.event_type}
              onChange={(e) =>
                setEvent({ ...event, event_type: e.target.value })
              }
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={event.severity}
              onChange={(e) => setEvent({ ...event, severity: e.target.value })}
            >
              <option value="info">Informativo</option>
              <option value="warning">Advertencia</option>
              <option value="critical">Critico</option>
            </select>
            <input
              className="h-10 rounded-md border px-3 text-sm"
              required
              placeholder="Descripcion del evento"
              value={event.description}
              onChange={(e) =>
                setEvent({ ...event, description: e.target.value })
              }
            />
            <Button isLoading={savingAction === "event"} type="submit">
              Registrar
            </Button>
          </form>
        </Card>
      ) : null}
      <Card title="Linea de tiempo clinica">
        <div className="space-y-2">
          {timeline.length ? (
            timeline.map((item) => (
              <div
                className="border-l-2 border-brand-500 py-1 pl-3 text-sm"
                key={item.id}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{item.title}</b>
                  <span className="text-xs text-slate-500">
                    {new Date(item.occurred_at).toLocaleString("es-HN")}
                  </span>
                </div>
                <p>{item.description}</p>
                <p className="text-xs text-slate-500">
                  {item.user || "Sistema"}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="Sin actividad clinica registrada." />
          )}
        </div>
      </Card>
    </div>
  );
}

function HospitalizationActions({
  admission,
  beds,
  onSaved,
}: {
  admission: Hospitalization;
  beds: HospitalBed[];
  onSaved: () => Promise<void>;
}) {
  const [bed, setBed] = useState("");
  const [notes, setNotes] = useState("");
  async function moveBed() {
    if (!bed) return toast.error("Selecciona una cama disponible.");
    try {
      if (admission.current_bed)
        await changeHospitalBed(admission.id, { bed: Number(bed), notes });
      else await assignHospitalBed(admission.id, { bed: Number(bed), notes });
      toast.success("Cama actualizada correctamente.");
      setBed("");
      setNotes("");
      await onSaved();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }
  async function cancel() {
    const reason = window.prompt("Motivo de cancelación") || "";
    if (!reason) return;
    try {
      await cancelHospitalization(admission.id, { reason });
      toast.success("Internamiento cancelado.");
      await onSaved();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }
  return (
    <Card title="Acciones">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={bed}
          onChange={(e) => setBed(e.target.value)}
        >
          <option value="">Cama disponible</option>
          {beds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bed_code} · {b.room_name}
            </option>
          ))}
        </select>
        <input
          className="h-10 rounded-md border px-3 text-sm"
          placeholder="Notas de traslado"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button type="button" onClick={moveBed}>
          {admission.current_bed ? "Cambiar cama" : "Asignar cama"}
        </Button>
        <Button type="button" variant="danger" onClick={cancel}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}

function DischargeWorkflowSection({
  admission,
  role,
  summaries,
  invoice,
  onSaved,
}: {
  admission: Hospitalization;
  role: string;
  summaries: DischargeSummary[];
  invoice: Invoice | null;
  onSaved: () => Promise<void>;
}) {
  const isDoctor = role === "medico";
  const canFinance = ["admin", "recepcionista"].includes(role);
  const latest = summaries[0];
  const signed = summaries.find((entry) => entry.status === "signed");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({
    discharge_type: "medical",
    hospital_course: latest?.status === "draft" ? latest.hospital_course : "",
    discharge_diagnoses: latest?.status === "draft" ? latest.discharge_diagnoses : "",
    condition_at_discharge: latest?.status === "draft" ? latest.condition_at_discharge : "",
    treatment_at_discharge: latest?.status === "draft" ? latest.treatment_at_discharge || "" : "",
    recommendations: latest?.status === "draft" ? latest.recommendations : "",
    warning_signs: latest?.status === "draft" ? latest.warning_signs || "" : "",
    follow_up_plan: latest?.status === "draft" ? latest.follow_up_plan : "",
    pending_results: latest?.status === "draft" ? latest.pending_results || "" : "",
  });
  async function run(name: string, task: () => Promise<unknown>, message: string) {
    if (busy) return;
    try {
      setBusy(name);
      await task();
      toast.success(message);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  }
  async function saveSummary(e: FormEvent) {
    e.preventDefault();
    if ([form.hospital_course, form.discharge_diagnoses, form.condition_at_discharge, form.recommendations, form.follow_up_plan].some((value) => value.trim().length < 3)) return toast.error("Completa evolución, diagnósticos, condición, recomendaciones y seguimiento.");
    await run("summary", () => saveDischargeSummary(admission.id, form), "Resumen de egreso guardado como borrador.");
  }
  async function completeDischarge() {
    if (!signed) return toast.error("Se requiere un resumen de egreso firmado.");
    const hasBalance = Number(invoice?.balance_due || 0) > 0;
    const allowPending = hasBalance && role === "admin" ? window.confirm(`La factura tiene saldo pendiente de L ${invoice?.balance_due}. ¿Autorizar el alta con saldo?`) : false;
    if (hasBalance && !allowPending) return toast.error("Registra el pago o autoriza expresamente el saldo pendiente.");
    if (!window.confirm("El alta cerrará el internamiento, cancelará dosis futuras y enviará la cama a limpieza. ¿Continuar?")) return;
    await run("complete", () => dischargeHospitalization(admission.id, { discharge_reason: "Alta clínica confirmada", allow_pending_balance: allowPending, bed_status: "cleaning" }), "Alta hospitalaria completada.");
  }
  return (
    <Card title="Alta médica y cierre hospitalario">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            <p><b>Estado clínico:</b> {statusLabel[admission.status] || admission.status}</p>
            <p><b>Resumen:</b> {signed ? `Firmado, versión ${signed.version}` : latest ? "Borrador pendiente de firma" : "No creado"}</p>
            <p><b>Factura:</b> {invoice ? `${invoice.invoice_number} · saldo L ${invoice.balance_due}` : "No generada"}</p>
          </div>
          {isDoctor && !isClosedAdmission(admission.status) && admission.status !== "discharge_pending" ? <Button type="button" isLoading={busy === "request"} onClick={() => run("request", () => requestHospitalDischarge(admission.id, "Alta indicada por médico tratante"), "Solicitud de alta registrada. La cama permanece ocupada.")}>Solicitar alta</Button> : null}
          {canFinance && !isClosedAdmission(admission.status) ? <Button type="button" variant="outline" isLoading={busy === "invoice"} onClick={() => run("invoice", () => generateHospitalInvoice(admission.id), "Factura hospitalaria sincronizada sin duplicados.")}>Generar o actualizar factura</Button> : null}
          {signed && invoice && !isClosedAdmission(admission.status) && ["admin", "medico"].includes(role) ? <Button type="button" variant="danger" isLoading={busy === "complete"} onClick={completeDischarge}>Confirmar alta y liberar cama</Button> : null}
        </div>
        {isDoctor && !isClosedAdmission(admission.status) ? (
          <form className="grid gap-2" onSubmit={saveSummary}>
            <select className="h-10 rounded-md border px-3 text-sm" value={form.discharge_type} onChange={(e) => setForm({ ...form, discharge_type: e.target.value })}><option value="medical">Alta médica</option><option value="voluntary">Alta voluntaria</option><option value="transfer">Traslado</option><option value="death">Defunción</option><option value="abandonment">Abandono</option><option value="other">Otra</option></select>
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Evolución durante el internamiento" value={form.hospital_course} onChange={(e) => setForm({ ...form, hospital_course: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Diagnósticos de egreso" value={form.discharge_diagnoses} onChange={(e) => setForm({ ...form, discharge_diagnoses: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Condición al egreso" value={form.condition_at_discharge} onChange={(e) => setForm({ ...form, condition_at_discharge: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Tratamiento al egreso" value={form.treatment_at_discharge} onChange={(e) => setForm({ ...form, treatment_at_discharge: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Recomendaciones" value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Signos de alarma" value={form.warning_signs} onChange={(e) => setForm({ ...form, warning_signs: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Plan de seguimiento" value={form.follow_up_plan} onChange={(e) => setForm({ ...form, follow_up_plan: e.target.value })} />
            <textarea className="min-h-16 rounded-md border p-2 text-sm" placeholder="Resultados u órdenes pendientes" value={form.pending_results} onChange={(e) => setForm({ ...form, pending_results: e.target.value })} />
            <div className="flex gap-2"><Button type="submit" isLoading={busy === "summary"}>Guardar borrador</Button>{latest?.status === "draft" ? <Button type="button" variant="outline" isLoading={busy === "sign"} onClick={() => run("sign", () => signDischargeSummary(admission.id, latest.id), "Resumen de egreso firmado e inmutable.")}>Firmar resumen</Button> : null}</div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}

function VitalSignsSection({
  admission,
  onSaved,
}: {
  admission: Hospitalization;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    const values = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== ""),
    );
    const checks: Array<[string, number, number, string]> = [
      ["temperature", 30, 45, "La temperatura debe estar entre 30 y 45."],
      ["oxygen_saturation", 0, 100, "La saturación debe estar entre 0 y 100."],
      ["pain_scale", 0, 10, "El dolor debe estar entre 0 y 10."],
    ];
    for (const [key, min, max, message] of checks) {
      if (values[key] !== undefined) {
        const parsed = Number(values[key]);
        if (!Number.isFinite(parsed) || parsed < min || parsed > max)
          return toast.error(message);
      }
    }
    try {
      await createHospitalVitalSigns(admission.id, values);
      toast.success("Signos vitales registrados correctamente.");
      setForm({});
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  const fields = [
    "temperature",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
    "heart_rate",
    "respiratory_rate",
    "oxygen_saturation",
    "weight",
    "height",
    "glucose",
    "pain_scale",
  ];
  return (
    <Card title="Signos vitales hospitalarios">
      <form className="grid gap-2 md:grid-cols-2" onSubmit={submit}>
        {fields.map((field) => (
          <input
            key={field}
            className="h-10 rounded-md border px-3 text-sm"
            inputMode="decimal"
            placeholder={field}
            value={form[field] || ""}
            onChange={(e) =>
              setForm({
                ...form,
                [field]:
                  field.includes("pressure") ||
                  field.includes("rate") ||
                  field.includes("saturation") ||
                  field === "glucose" ||
                  field === "pain_scale"
                    ? onlyDigits(e.target.value)
                    : cleanDecimal(e.target.value, 2),
              })
            }
          />
        ))}
        <input
          className="h-10 rounded-md border px-3 text-sm md:col-span-2"
          placeholder="Notas"
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Button type="submit">Guardar signos</Button>
      </form>
      <div className="mt-4 space-y-2">
        {admission.recent_vital_signs?.length ? (
          admission.recent_vital_signs.map((s) => (
            <p
              key={s.id}
              className="rounded-md bg-slate-50 p-2 text-xs text-slate-600"
            >
              {new Date(s.recorded_at).toLocaleString("es-HN")} · PA{" "}
              {s.blood_pressure_systolic || "-"}/
              {s.blood_pressure_diastolic || "-"} · Temp {s.temperature || "-"}{" "}
              · SpO2 {s.oxygen_saturation || "-"}
            </p>
          ))
        ) : (
          <EmptyState title="Sin signos hospitalarios." />
        )}
      </div>
    </Card>
  );
}

function NursingNotesSection({
  admission,
  onSaved,
}: {
  admission: Hospitalization;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    note_type: "normal",
    title: "",
    note: "",
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.note.trim().length < 5)
      return toast.error(
        "La nota de enfermería debe tener al menos 5 caracteres.",
      );
    try {
      await createNursingNote(admission.id, {
        ...form,
        title: form.title.trim(),
        note: form.note.trim(),
      });
      toast.success("Nota de enfermería registrada correctamente.");
      setForm({ note_type: "normal", title: "", note: "" });
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  return (
    <Card title="Notas de enfermería">
      <form className="grid gap-2" onSubmit={submit}>
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={form.note_type}
          onChange={(e) => setForm({ ...form, note_type: e.target.value })}
        >
          <option value="normal">Normal</option>
          <option value="important">Importante</option>
          <option value="urgent">Urgente</option>
          <option value="medication">Medicamento</option>
          <option value="observation">Observación</option>
          <option value="incident">Incidente</option>
        </select>
        <input
          className="h-10 rounded-md border px-3 text-sm"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="min-h-24 rounded-md border px-3 py-2 text-sm"
          required
          placeholder="Nota clínica de enfermería"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <Button type="submit">Agregar nota</Button>
      </form>
      <div className="mt-4 space-y-2">
        {admission.recent_nursing_notes?.length ? (
          admission.recent_nursing_notes.map((n) => (
            <p
              key={n.id}
              className="rounded-md bg-slate-50 p-2 text-xs text-slate-600"
            >
              <b>{n.title || n.note_type}</b> · {n.note}
            </p>
          ))
        ) : (
          <EmptyState title="Sin notas de enfermería." />
        )}
      </div>
    </Card>
  );
}

const roundTypeLabel: Record<string, string> = {
  routine: "Rutina",
  urgent: "Urgente",
  medication: "Medicamento",
  follow_up: "Seguimiento",
  other: "Otro",
};
const medicationRouteLabel: Record<string, string> = {
  oral: "Oral",
  iv: "IV",
  im: "IM",
  sc: "SC",
  topical: "Tópica",
  inhaled: "Inhalada",
  other: "Otra",
};

function NursingRoundsSection({
  admission,
  rounds,
  onSaved,
}: {
  admission: Hospitalization;
  rounds: NursingRound[];
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    round_type: "routine",
    general_condition: "",
    pain_level: "",
    consciousness_status: "",
    mobility_status: "",
    feeding_status: "",
    elimination_status: "",
    notes: "",
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      form.pain_level &&
      (Number(form.pain_level) < 0 || Number(form.pain_level) > 10)
    )
      return toast.error("El dolor debe estar entre 0 y 10.");
    try {
      await createNursingRound(admission.id, {
        ...form,
        pain_level: form.pain_level ? Number(form.pain_level) : undefined,
        notes: form.notes.trim(),
      });
      toast.success("Ronda de enfermería registrada correctamente.");
      setForm({
        round_type: "routine",
        general_condition: "",
        pain_level: "",
        consciousness_status: "",
        mobility_status: "",
        feeding_status: "",
        elimination_status: "",
        notes: "",
      });
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  return (
    <Card title="Rondas de enfermería">
      <form className="grid gap-2" onSubmit={submit}>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="h-10 rounded-md border px-3 text-sm"
            required
            value={form.round_type}
            onChange={(e) => setForm({ ...form, round_type: e.target.value })}
          >
            <option value="routine">Rutina</option>
            <option value="urgent">Urgente</option>
            <option value="medication">Medicamento</option>
            <option value="follow_up">Seguimiento</option>
            <option value="other">Otro</option>
          </select>
          <input
            className="h-10 rounded-md border px-3 text-sm"
            inputMode="numeric"
            placeholder="Dolor 0-10"
            value={form.pain_level}
            onChange={(e) =>
              setForm({
                ...form,
                pain_level: onlyDigits(e.target.value).slice(0, 2),
              })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            placeholder="Condición general"
            value={form.general_condition}
            onChange={(e) =>
              setForm({ ...form, general_condition: e.target.value })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            placeholder="Conciencia"
            value={form.consciousness_status}
            onChange={(e) =>
              setForm({ ...form, consciousness_status: e.target.value })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            placeholder="Movilidad"
            value={form.mobility_status}
            onChange={(e) =>
              setForm({ ...form, mobility_status: e.target.value })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            placeholder="Alimentación"
            value={form.feeding_status}
            onChange={(e) =>
              setForm({ ...form, feeding_status: e.target.value })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            placeholder="Eliminación"
            value={form.elimination_status}
            onChange={(e) =>
              setForm({ ...form, elimination_status: e.target.value })
            }
          />
        </div>
        <textarea
          className="min-h-20 rounded-md border px-3 py-2 text-sm"
          placeholder="Notas de ronda"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Button type="submit">Nueva ronda</Button>
      </form>
      <div className="mt-4 space-y-2">
        {rounds.length ? (
          rounds.map((round) => (
            <div
              key={round.id}
              className="rounded-md bg-slate-50 p-3 text-xs text-slate-600"
            >
              <p className="font-semibold text-slate-800">
                {roundTypeLabel[round.round_type] || round.round_type} ·{" "}
                {round.nurse_name || "Enfermería"} ·{" "}
                {round.created_at
                  ? new Date(round.created_at).toLocaleString("es-HN")
                  : ""}
              </p>
              <p>
                Condición: {round.general_condition || "-"} · Dolor:{" "}
                {round.pain_level ?? "-"}
              </p>
              {round.notes ? <p>{round.notes}</p> : null}
            </div>
          ))
        ) : (
          <EmptyState
            title="Sin rondas de enfermería."
            description="Las rondas registradas aparecerán aquí."
          />
        )}
      </div>
    </Card>
  );
}

function MedicationAdministrationsSection({
  admission,
  medications,
  inventoryItems,
  consumptions,
  canWrite,
  canReverse,
  onSaved,
}: {
  admission: Hospitalization;
  medications: MedicationAdministration[];
  inventoryItems: InventoryItem[];
  consumptions: HospitalConsumption[];
  canWrite: boolean;
  canReverse: boolean;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [consumption, setConsumption] = useState({
    inventory_item: "",
    quantity: "1",
    usage_type: "supply",
    notes: "",
  });
  async function submitConsumption(e: FormEvent) {
    e.preventDefault();
    if (!consumption.inventory_item || Number(consumption.quantity) <= 0) return toast.error("Selecciona el insumo y una cantidad válida.");
    try {
      setBusy("consumption");
      await createHospitalConsumption(admission.id, {
        ...consumption,
        inventory_item: Number(consumption.inventory_item),
        quantity: consumption.quantity,
        notes: consumption.notes.trim(),
        billable: true,
      });
      toast.success("Consumo hospitalario registrado.");
      setConsumption({ inventory_item: "", quantity: "1", usage_type: "supply", notes: "" });
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  }
  async function action(med: MedicationAdministration, type: "administer" | "omit" | "delay" | "refuse" | "unavailable") {
    if (busy) return;
    try {
      setBusy(`${type}-${med.id}`);
      if (type === "administer") {
        const dose = window.prompt("Dosis realmente administrada", med.ordered_dose || med.dosage.split(" ")[0] || "")?.trim() || "";
        const quantity = window.prompt("Cantidad de inventario utilizada", med.inventory_quantity || "1")?.trim() || "";
        if (!dose || Number(dose) <= 0 || !quantity || Number(quantity) <= 0) return toast.error("Confirma dosis y cantidad utilizada.");
        if (!window.confirm(`Confirma paciente ${med.patient_name || admission.patient_name}, ${med.medication_name}, dosis ${dose} ${med.dose_unit || ""}, vía ${medicationRouteLabel[med.route] || med.route}.`)) return;
        await administerMedication(med.id, {
          administered_dose: dose,
          dose_unit: med.dose_unit || "mg",
          route: med.route,
          inventory_quantity: quantity,
          notes: window.prompt("Observaciones opcionales") || "",
          idempotency_key: crypto.randomUUID(),
        });
      } else if (type === "omit") {
        const reason = window.prompt("Motivo obligatorio de omisión") || "";
        if (!reason) return toast.error("El motivo de omisión es obligatorio.");
        await omitMedication(med.id, { reason });
      } else if (type === "refuse") {
        const reason = window.prompt("Explicación y motivo del rechazo") || "";
        if (!reason) return toast.error("El motivo de rechazo es obligatorio.");
        await refuseMedication(med.id, { reason });
      } else if (type === "unavailable") {
        const reason = window.prompt("Describe la falta de existencia") || "";
        if (!reason) return toast.error("La observación de falta de stock es obligatoria.");
        await unavailableMedication(med.id, { reason });
      } else {
        const reason = window.prompt("Motivo del retraso (mínimo 5 caracteres)") || "";
        if (reason.trim().length < 5) return;
        await delayMedication(med.id, { notes: reason });
      }
      toast.success("Estado de medicamento actualizado.");
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  }
  async function reverse(med: MedicationAdministration) {
    const reason = window.prompt("Motivo obligatorio de reversión")?.trim() || "";
    if (reason.length < 5) return toast.error("El motivo debe tener al menos 5 caracteres.");
    if (!window.confirm("Se restaurará el inventario en los mismos lotes. ¿Deseas continuar?")) return;
    try { setBusy(`reverse-${med.id}`); await reverseMedication(med.id, reason); toast.success("Administración e inventario revertidos."); await onSaved(); } catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(""); }
  }
  return (
    <div className="space-y-4">
    <Card title="Administración de medicamentos">
      <p className="mb-3 text-xs text-slate-500">Las dosis aparecen desde indicaciones médicas activas. El inventario se descuenta únicamente al confirmar la administración.</p>
      <div className="mt-4 space-y-2">
        {medications.length ? (
          medications.map((med) => {
            const locked = ["administered", "omitted", "refused", "unavailable", "cancelled", "reversed"].includes(
              med.status,
            );
            return (
              <div
                key={med.id}
                className="rounded-md bg-slate-50 p-3 text-xs text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {med.medication_name} · {med.dosage} ·{" "}
                    {medicationRouteLabel[med.route] || med.route}
                  </p>
                  <StatusPill value={med.status} />
                </div>
                <p>
                  Hora:{" "}
                  {med.scheduled_time
                    ? new Date(med.scheduled_time).toLocaleString("es-HN")
                    : "No programada"}{" "}
                  · Enfermera: {med.administered_by_name || "-"}
                </p>
                {med.notes ? <p>{med.notes}</p> : null}
                {med.omission_reason ? (
                  <p>Motivo omisión: {med.omission_reason}</p>
                ) : null}
                {med.refusal_reason ? <p>Motivo rechazo: {med.refusal_reason}</p> : null}
                {med.unavailable_reason ? <p>Falta de stock: {med.unavailable_reason}</p> : null}
                {!locked && canWrite ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => action(med, "administer")}
                    >
                      Administrar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={Boolean(busy)}
                      onClick={() => action(med, "delay")}
                    >
                      Retrasar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={Boolean(busy)}
                      onClick={() => action(med, "omit")}
                    >
                      Omitir
                    </Button>
                    <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => action(med, "refuse")}>Rechazo</Button>
                    <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => action(med, "unavailable")}>Sin existencia</Button>
                  </div>
                ) : null}
                {med.status === "administered" && canReverse ? <div className="mt-2"><Button type="button" variant="danger" disabled={Boolean(busy)} onClick={() => void reverse(med)}>Revertir con trazabilidad</Button></div> : null}
              </div>
            );
          })
        ) : (
          <EmptyState
            title="Sin medicamentos programados."
            description="Los medicamentos pendientes aparecerán aquí."
          />
        )}
      </div>
    </Card>
    {canWrite ? <Card title="Consumos e insumos">
      <form className="grid gap-2" onSubmit={submitConsumption}>
        <select className="h-10 rounded-md border px-3 text-sm" required value={consumption.inventory_item} onChange={(e) => setConsumption({ ...consumption, inventory_item: e.target.value })}>
          <option value="">Selecciona un insumo</option>
          {inventoryItems.filter((item) => item.item_type !== "medicamento").map((item) => <option key={item.id} value={item.id}>{item.name} · Stock {item.stock_current}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" value={consumption.quantity} onChange={(e) => setConsumption({ ...consumption, quantity: cleanDecimal(e.target.value) })} placeholder="Cantidad" />
          <select className="h-10 rounded-md border px-3 text-sm" value={consumption.usage_type} onChange={(e) => setConsumption({ ...consumption, usage_type: e.target.value })}>
            <option value="supply">Insumo</option><option value="procedure_supply">Procedimiento</option><option value="serum">Suero</option><option value="wound_care">Curación</option><option value="other">Otro</option>
          </select>
        </div>
        <input className="h-10 rounded-md border px-3 text-sm" placeholder="Observaciones" value={consumption.notes} onChange={(e) => setConsumption({ ...consumption, notes: e.target.value })} />
        <Button type="submit" isLoading={busy === "consumption"}>Registrar consumo real</Button>
      </form>
      <div className="mt-3 space-y-2">{consumptions.length ? consumptions.map((entry) => <div key={entry.id} className="rounded-md bg-slate-50 p-2 text-xs"><b>{entry.inventory_item_name}</b> · {entry.quantity} · {entry.invoiced ? "Facturado" : "Pendiente de facturar"}</div>) : <EmptyState title="No hay consumos hospitalarios registrados." />}</div>
    </Card> : null}
    </div>
  );
}

export function HospitalRoomsBedsPage() {
  const [rooms, setRooms] = useState<HospitalRoom[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [updating, setUpdating] = useState("");
  const [roomForm, setRoomForm] = useState({
    name: "",
    room_number: "",
    floor: "",
    room_type: "general",
  });
  const [bedForm, setBedForm] = useState({
    room: "",
    bed_number: "",
    status: "available",
    notes: "",
  });
  async function load() {
    const [r, b] = await Promise.all([getHospitalRooms(), getHospitalBeds()]);
    setRooms(r);
    setBeds(b);
  }
  useEffect(() => {
    load().catch((e) => toast.error(getErrorMessage(e)));
  }, []);
  async function saveRoom(e: FormEvent) {
    e.preventDefault();
    if (
      !requireTrimmed(roomForm.name, "El nombre de habitación es obligatorio.")
    )
      return;
    if (
      !requireTrimmed(
        roomForm.room_number,
        "El número de habitación es obligatorio.",
      )
    )
      return;
    try {
      await createHospitalRoom({
        ...roomForm,
        name: roomForm.name.trim(),
        room_number: roomForm.room_number.trim(),
        floor: roomForm.floor.trim(),
      });
      toast.success("Habitación creada.");
      setRoomForm({
        name: "",
        room_number: "",
        floor: "",
        room_type: "general",
      });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  async function saveBed(e: FormEvent) {
    e.preventDefault();
    if (!bedForm.room) return toast.error("Selecciona una habitación.");
    if (
      !requireTrimmed(bedForm.bed_number, "El número de cama es obligatorio.")
    )
      return;
    try {
      await createHospitalBed({
        ...bedForm,
        room: Number(bedForm.room),
        bed_number: bedForm.bed_number.trim(),
        notes: bedForm.notes.trim(),
      });
      toast.success("Cama creada.");
      setBedForm({ room: "", bed_number: "", status: "available", notes: "" });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  async function toggleRoom(room: HospitalRoom) {
    const key = `room-${room.id}`;
    if (updating) return;
    setUpdating(key);
    try {
      await updateHospitalRoom(room.id, { is_active: !room.is_active });
      toast.success(
        room.is_active ? "Habitación desactivada." : "Habitación activada.",
      );
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdating("");
    }
  }
  async function editRoom(room: HospitalRoom) {
    const name = window.prompt("Nombre de la habitación", room.name)?.trim();
    if (!name) return;
    const floor = window.prompt("Piso", room.floor || "")?.trim();
    if (floor === undefined) return;
    const key = `room-${room.id}`;
    if (updating) return;
    setUpdating(key);
    try {
      await updateHospitalRoom(room.id, { name, floor });
      toast.success("Habitación actualizada.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdating("");
    }
  }
  async function changeBedStatus(bed: HospitalBed, status: string) {
    const key = `bed-${bed.id}`;
    if (updating || bed.status === status) return;
    setUpdating(key);
    try {
      await updateHospitalBed(bed.id, { status });
      toast.success("Estado operativo de cama actualizado.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdating("");
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Habitaciones y camas"
        description="Gestión operativa de camas hospitalarias."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nueva habitación">
          <form className="grid gap-3" onSubmit={saveRoom}>
            <input
              className="h-10 rounded-md border px-3 text-sm"
              required
              placeholder="Nombre"
              value={roomForm.name}
              onChange={(e) =>
                setRoomForm({ ...roomForm, name: e.target.value })
              }
            />
            <input
              className="h-10 rounded-md border px-3 text-sm"
              required
              placeholder="Número"
              value={roomForm.room_number}
              onChange={(e) =>
                setRoomForm({ ...roomForm, room_number: e.target.value })
              }
            />
            <input
              className="h-10 rounded-md border px-3 text-sm"
              placeholder="Piso"
              value={roomForm.floor}
              onChange={(e) =>
                setRoomForm({ ...roomForm, floor: e.target.value })
              }
            />
            <Button type="submit">Crear habitación</Button>
          </form>
        </Card>
        <Card title="Nueva cama">
          <form className="grid gap-3" onSubmit={saveBed}>
            <select
              className="h-10 rounded-md border px-3 text-sm"
              required
              value={bedForm.room}
              onChange={(e) => setBedForm({ ...bedForm, room: e.target.value })}
            >
              <option value="">Habitación</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number} · {r.name}
                </option>
              ))}
            </select>
            <input
              className="h-10 rounded-md border px-3 text-sm"
              required
              placeholder="Número de cama"
              value={bedForm.bed_number}
              onChange={(e) =>
                setBedForm({ ...bedForm, bed_number: e.target.value })
              }
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={bedForm.status}
              onChange={(e) =>
                setBedForm({ ...bedForm, status: e.target.value })
              }
            >
              <option value="available">Disponible</option>
              <option value="cleaning">Limpieza</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="blocked">Bloqueada</option>
            </select>
            <Button type="submit">Crear cama</Button>
          </form>
        </Card>
      </div>
      <Card title="Habitaciones">
        {rooms.length ? (
          <Table
            data={rooms}
            columns={[
              {
                key: "number",
                header: "Número",
                render: (room) => room.room_number,
              },
              { key: "name", header: "Nombre", render: (room) => room.name },
              {
                key: "floor",
                header: "Piso",
                render: (room) => room.floor || "-",
              },
              {
                key: "beds",
                header: "Camas",
                render: (room) => room.beds_count ?? 0,
              },
              {
                key: "occupied",
                header: "Ocupadas",
                render: (room) => room.occupied_beds ?? 0,
              },
              {
                key: "state",
                header: "Estado",
                render: (room) => (room.is_active ? "Activa" : "Inactiva"),
              },
              {
                key: "actions",
                header: "Acción",
                render: (room) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={Boolean(updating)}
                      type="button"
                      variant="outline"
                      onClick={() => void editRoom(room)}
                    >
                      Editar
                    </Button>
                    <Button
                      isLoading={updating === `room-${room.id}`}
                      type="button"
                      variant="outline"
                      onClick={() => void toggleRoom(room)}
                    >
                      {room.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="No hay habitaciones registradas." />
        )}
      </Card>
      <Card title="Camas">
        <Table
          data={beds}
          columns={[
            { key: "code", header: "Cama", render: (b) => b.bed_code },
            {
              key: "room",
              header: "Habitación",
              render: (b) => b.room_name || "-",
            },
            {
              key: "status",
              header: "Estado",
              render: (b) => <StatusPill value={b.status} />,
            },
            {
              key: "patient",
              header: "Paciente",
              render: (b) => b.current_patient || "-",
            },
            {
              key: "operation",
              header: "Estado operativo",
              render: (bed) => (
                <select
                  aria-label={`Estado de ${bed.bed_code}`}
                  className="h-9 rounded-md border px-2 text-xs"
                  disabled={Boolean(updating) || bed.status === "occupied"}
                  value={bed.status}
                  onChange={(event) =>
                    void changeBedStatus(bed, event.target.value)
                  }
                >
                  {bed.status === "occupied" ? (
                    <option value="occupied">Ocupada</option>
                  ) : null}
                  <option value="available">Disponible</option>
                  <option value="cleaning">Limpieza</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="blocked">Bloqueada</option>
                </select>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
