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
  createMedicationAdministration,
  createHospitalRoom,
  createHospitalVitalSigns,
  createHospitalization,
  createNursingNote,
  createNursingRound,
  createTreatmentPlan,
  delayMedication,
  dischargeHospitalization,
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
  signMedicalEvolution,
  changeMedicalInstructionStatus,
  updateHospitalBed,
  updateHospitalRoom,
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
  NursingRound,
  TreatmentPlan,
} from "../../types/hospitalization";
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
  administered: "Administrado",
  omitted: "Omitido",
  delayed: "Retrasado",
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
      ] = await Promise.all([
        getNursingRounds(id),
        getMedicationAdministrations(id),
        getMedicalEvolutions(id),
        getTreatmentPlans(id),
        getMedicalInstructions(id),
        getHospitalTimeline(id),
      ]);
      setRounds(nursingRounds);
      setMedications(medicationRows);
      setEvolutions(evolutionRows);
      setPlans(planRows);
      setInstructions(instructionRows);
      setTimeline(timelineRows);
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
        />
      ) : null}
      {canWriteNursing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <VitalSignsSection admission={admission} onSaved={load} />
          <NursingNotesSection admission={admission} onSaved={load} />
        </div>
      ) : null}
      {canWriteNursing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <NursingRoundsSection
            admission={admission}
            rounds={rounds}
            onSaved={load}
          />
          <MedicationAdministrationsSection
            admission={admission}
            medications={medications}
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
}: {
  admission: Hospitalization;
  canWriteMedical: boolean;
  canWriteNursing: boolean;
  evolutions: MedicalEvolution[];
  instructions: MedicalInstruction[];
  onSaved: () => Promise<void>;
  plans: TreatmentPlan[];
  timeline: HospitalTimelineEntry[];
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
    instruction_type: "general",
    priority: "routine",
    title: "",
    details: "",
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
    await run(
      "instruction",
      async () => {
        await createMedicalInstruction(admission.id, instruction);
        setInstruction({
          instruction_type: "general",
          priority: "routine",
          title: "",
          details: "",
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
                <option value="general">General</option>
                <option value="vital_signs">Signos vitales</option>
                <option value="diet">Dieta</option>
                <option value="activity">Actividad</option>
                <option value="procedure">Procedimiento</option>
              </select>
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
  async function discharge() {
    const reason = window.prompt("Motivo de alta hospitalaria") || "";
    if (!reason.trim()) return toast.error("El motivo de alta es obligatorio.");
    if (
      !window.confirm(
        "Después de dar alta se liberará la cama y se bloquearán acciones clínicas. ¿Deseas continuar?",
      )
    )
      return;
    try {
      await dischargeHospitalization(admission.id, {
        discharge_reason: reason.trim(),
        bed_status: "cleaning",
      });
      toast.success("Alta hospitalaria registrada.");
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
        <Button type="button" variant="outline" onClick={discharge}>
          Alta
        </Button>
        <Button type="button" variant="danger" onClick={cancel}>
          Cancelar
        </Button>
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
  onSaved,
}: {
  admission: Hospitalization;
  medications: MedicationAdministration[];
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    medication_name: "",
    dosage: "",
    route: "oral",
    scheduled_time: "",
    notes: "",
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!requireTrimmed(form.medication_name, "El medicamento es obligatorio."))
      return;
    if (!requireTrimmed(form.dosage, "La dosis es obligatoria.")) return;
    try {
      await createMedicationAdministration(admission.id, {
        ...form,
        medication_name: form.medication_name.trim(),
        dosage: form.dosage.trim(),
        notes: form.notes.trim(),
        scheduled_time: form.scheduled_time || null,
      });
      toast.success("Medicamento programado correctamente.");
      setForm({
        medication_name: "",
        dosage: "",
        route: "oral",
        scheduled_time: "",
        notes: "",
      });
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  async function action(id: number, type: "administer" | "omit" | "delay") {
    try {
      if (type === "administer") {
        if (!window.confirm("¿Confirmas que administraste este medicamento?"))
          return;
        await administerMedication(id, {
          notes: window.prompt("Observaciones opcionales") || "",
        });
      } else if (type === "omit") {
        const reason = window.prompt("Motivo obligatorio de omisión") || "";
        if (!reason) return toast.error("El motivo de omisión es obligatorio.");
        await omitMedication(id, { reason });
      } else {
        await delayMedication(id, {
          notes: window.prompt("Nota de retraso") || "",
        });
      }
      toast.success("Estado de medicamento actualizado.");
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  return (
    <Card title="Administración de medicamentos">
      <form className="grid gap-2" onSubmit={submit}>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="h-10 rounded-md border px-3 text-sm"
            required
            placeholder="Medicamento"
            value={form.medication_name}
            onChange={(e) =>
              setForm({ ...form, medication_name: e.target.value })
            }
          />
          <input
            className="h-10 rounded-md border px-3 text-sm"
            required
            placeholder="Dosis"
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          />
          <select
            className="h-10 rounded-md border px-3 text-sm"
            value={form.route}
            onChange={(e) => setForm({ ...form, route: e.target.value })}
          >
            <option value="oral">Oral</option>
            <option value="iv">IV</option>
            <option value="im">IM</option>
            <option value="sc">SC</option>
            <option value="topical">Tópica</option>
            <option value="inhaled">Inhalada</option>
            <option value="other">Otra</option>
          </select>
          <input
            className="h-10 rounded-md border px-3 text-sm"
            type="datetime-local"
            value={form.scheduled_time}
            onChange={(e) =>
              setForm({ ...form, scheduled_time: e.target.value })
            }
          />
        </div>
        <input
          className="h-10 rounded-md border px-3 text-sm"
          placeholder="Observaciones"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Button type="submit">Programar medicamento</Button>
      </form>
      <div className="mt-4 space-y-2">
        {medications.length ? (
          medications.map((med) => {
            const locked = ["administered", "omitted", "cancelled"].includes(
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
                {!locked ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => action(med.id, "administer")}
                    >
                      Administrar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => action(med.id, "delay")}
                    >
                      Retrasar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => action(med.id, "omit")}
                    >
                      Omitir
                    </Button>
                  </div>
                ) : null}
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
      toast.success(room.is_active ? "Habitación desactivada." : "Habitación activada.");
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
              { key: "number", header: "Número", render: (room) => room.room_number },
              { key: "name", header: "Nombre", render: (room) => room.name },
              { key: "floor", header: "Piso", render: (room) => room.floor || "-" },
              { key: "beds", header: "Camas", render: (room) => room.beds_count ?? 0 },
              { key: "occupied", header: "Ocupadas", render: (room) => room.occupied_beds ?? 0 },
              { key: "state", header: "Estado", render: (room) => room.is_active ? "Activa" : "Inactiva" },
              {
                key: "actions",
                header: "Acción",
                render: (room) => (
                  <Button
                    isLoading={updating === `room-${room.id}`}
                    type="button"
                    variant="outline"
                    onClick={() => void toggleRoom(room)}
                  >
                    {room.is_active ? "Desactivar" : "Activar"}
                  </Button>
                ),
              },
            ]}
          />
        ) : <EmptyState title="No hay habitaciones registradas." />}
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
                  onChange={(event) => void changeBedStatus(bed, event.target.value)}
                >
                  {bed.status === "occupied" ? <option value="occupied">Ocupada</option> : null}
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
