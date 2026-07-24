import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import {
  createConsultation,
  finalizeConsultation,
  getConsultation,
  getConsultationClinicalContext,
  saveConsultationDraft,
} from "../../api/medicalRecordsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import type { ClinicalConsultation, ConsultationClinicalContext, ConsultationPayload } from "../../types/medicalRecord";
import { ConsultationClinicalContextPanel } from "./ConsultationClinicalContext";
import { ConsultationForm } from "./ConsultationForm";
import { todayIso } from "./medicalRecordUtils";

type SaveState = "idle" | "pending" | "saving" | "saved" | "offline" | "error" | "conflict";
type StoredDraft = { payload: ConsultationPayload; savedAt: string; serverVersion: number };

export function ConsultationFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState<ClinicalConsultation | null>(null);
  const [context, setContext] = useState<ConsultationClinicalContext | null>(null);
  const [payload, setPayload] = useState<ConsultationPayload>(() => emptyPayload(searchParams.get("patient") ?? ""));
  const [recovery, setRecovery] = useState<StoredDraft | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const completed = consultation?.status === "finalizada";
  const blocker = useBlocker(dirty && !saving && !completed);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving || completed) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [completed, dirty, saving]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [loaded, clinicalContext] = await Promise.all([
          getConsultation(id),
          getConsultationClinicalContext(id),
        ]);
        const serverPayload = consultationPayload(loaded);
        const key = consultationDraftKey(user, loaded);
        setConsultation(loaded);
        setContext(clinicalContext);
        setPayload(serverPayload);
        setDraftKey(key);
        const stored = readDraft(key);
        if (stored && stored.savedAt > loaded.actualizado_en && stored.serverVersion >= loaded.version) {
          setRecovery(stored);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, user]);

  const persist = useCallback(async (mode: "autosave" | "manual") => {
    if (saving || completed) return consultation;
    if (!online) {
      setSaveState("offline");
      return null;
    }
    setSaving(true);
    setSaveState("saving");
    try {
      const requestPayload = {
        ...payload,
        expected_version: consultation?.version,
      };
      const saved = id
        ? await saveConsultationDraft(id, requestPayload)
        : await createConsultation(requestPayload);
      setConsultation(saved);
      setPayload(consultationPayload(saved));
      setDirty(false);
      setSaveState("saved");
      if (draftKey) sessionStorage.removeItem(draftKey);
      if (mode === "manual") toast.success("Consulta guardada correctamente.");
      if (!id) navigate(`/doctor/consultations/${saved.id}/edit`, { replace: true });
      return saved;
    } catch (error) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setSaveState(conflict ? "conflict" : "error");
      if (conflict) toast.error("La consulta fue modificada desde otra sesión. Conservamos tus cambios locales.");
      else if (mode === "manual") toast.error(getErrorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [completed, consultation, draftKey, id, navigate, online, payload, saving]);

  useEffect(() => {
    if (!dirty || !id || completed) return;
    if (!online) {
      setSaveState("offline");
      return;
    }
    setSaveState("pending");
    const timer = window.setTimeout(() => void persist("autosave"), 3000);
    return () => window.clearTimeout(timer);
  }, [completed, dirty, id, online, payload, persist]);

  function change(next: ConsultationPayload) {
    setPayload(next);
    setDirty(true);
    setSaveState(online ? "pending" : "offline");
    if (draftKey) {
      sessionStorage.setItem(draftKey, JSON.stringify({
        payload: next,
        savedAt: new Date().toISOString(),
        serverVersion: consultation?.version ?? 1,
      } satisfies StoredDraft));
    }
  }

  async function submit(next: ConsultationPayload) {
    setPayload(next);
    await persist("manual");
  }

  async function finish() {
    if (!id || saving) return;
    const saved = dirty ? await persist("manual") : consultation;
    if (!saved) return;
    setSaving(true);
    try {
      const finalized = await finalizeConsultation(id, {
        chief_complaint: payload.chief_complaint,
        clinical_assessment: payload.clinical_assessment,
        preliminary_diagnosis: payload.preliminary_diagnosis,
        treatment_plan: payload.treatment_plan,
        expected_version: saved.version,
      });
      if (draftKey) sessionStorage.removeItem(draftKey);
      setDirty(false);
      setFinalizeOpen(false);
      toast.success("Consulta finalizada correctamente.");
      navigate(`/clinic/consultations/${finalized.id}`, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveAndLeave() {
    const saved = await persist("manual");
    if (saved && blocker.state === "blocked") blocker.proceed();
  }

  const statusText = useMemo(() => ({
    idle: "Sin cambios pendientes",
    pending: "Cambios pendientes",
    saving: "Guardando…",
    saved: "Guardado",
    offline: "Sin conexión · borrador conservado en este dispositivo",
    error: "Error al guardar · tus cambios siguen pendientes",
    conflict: "Conflicto de edición · actualiza antes de continuar",
  }[saveState]), [saveState]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={completed ? "Consulta finalizada" : id ? "Consulta médica activa" : "Nueva consulta"}
        description="Atención clínica, contexto del paciente y guardado seguro."
        actions={<span className={`text-sm font-semibold ${saveState === "error" || saveState === "conflict" ? "text-rose-700" : saveState === "offline" ? "text-amber-700" : "text-slate-600"}`}>{statusText}</span>}
      />

      {recovery ? (
        <Card title="Cambios sin sincronizar encontrados">
          <p className="text-sm text-slate-600">Existe un borrador local más reciente para esta consulta. Elige qué versión deseas revisar.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => { setPayload(recovery.payload); setRecovery(null); setDirty(true); setSaveState("pending"); }}>Recuperar borrador</Button>
            <Button variant="outline" onClick={() => { if (draftKey) sessionStorage.removeItem(draftKey); setRecovery(null); }}>Usar versión del servidor</Button>
          </div>
        </Card>
      ) : null}

      <ConsultationClinicalContextPanel context={context} />
      <ConsultationForm consultation={consultation} isSubmitting={saving} onChange={change} onSubmit={submit} payload={payload} />

      {!completed && id ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button isLoading={saving} onClick={() => void persist("manual")} variant="outline">Guardar</Button>
          <Button disabled={dirty || saveState === "conflict" || !online} onClick={() => setFinalizeOpen(true)}>Finalizar consulta</Button>
        </div>
      ) : null}

      <Modal open={finalizeOpen} title="Finalizar consulta" onClose={() => setFinalizeOpen(false)} actions={<><ModalCloseButton onClick={() => setFinalizeOpen(false)} /><Button isLoading={saving} onClick={() => void finish()}>Finalizar</Button></>}>
        <p className="text-sm text-slate-600">Después de finalizar, la información clínica quedará en modo de solo lectura y la visita avanzará según la configuración de la clínica.</p>
      </Modal>

      <Modal open={blocker.state === "blocked"} title="Cambios sin guardar" onClose={() => blocker.reset?.()} actions={<><Button variant="outline" onClick={() => blocker.reset?.()}>Permanecer</Button><Button variant="danger" onClick={() => blocker.proceed?.()}>Salir sin guardar</Button><Button isLoading={saving} onClick={() => void saveAndLeave()}>Guardar y salir</Button></>}>
        <p className="text-sm text-slate-600">Tienes cambios sin guardar. ¿Deseas salir?</p>
      </Modal>
    </div>
  );
}

function emptyPayload(patient: string): ConsultationPayload {
  return {
    patient,
    doctor: "",
    consultation_date: todayIso(),
    start_time: "",
    end_time: "",
    chief_complaint: "",
    symptoms: "",
    physical_exam: "",
    clinical_assessment: "",
    preliminary_diagnosis: "",
    treatment_plan: "",
    recommendations: "",
    private_notes: "",
  };
}

function consultationPayload(consultation: ClinicalConsultation): ConsultationPayload {
  return {
    patient: consultation.patient,
    doctor: consultation.doctor,
    consultation_date: consultation.consultation_date,
    start_time: consultation.start_time?.slice(0, 5) ?? "",
    end_time: consultation.end_time?.slice(0, 5) ?? "",
    chief_complaint: consultation.chief_complaint ?? "",
    symptoms: consultation.symptoms ?? "",
    physical_exam: consultation.physical_exam ?? "",
    clinical_assessment: consultation.clinical_assessment ?? "",
    preliminary_diagnosis: consultation.preliminary_diagnosis ?? "",
    treatment_plan: consultation.treatment_plan ?? "",
    recommendations: consultation.recommendations ?? "",
    private_notes: consultation.private_notes ?? "",
  };
}

function consultationDraftKey(user: ReturnType<typeof useAuth>["user"], consultation: ClinicalConsultation) {
  const clinicId = user?.clinica && typeof user.clinica === "object" ? user.clinica.id : user?.clinica;
  return ["medicore.consultationDraft", clinicId ?? "none", user?.id ?? "none", consultation.patient, consultation.patient_visit ?? "none", consultation.id].join(".");
}

function readDraft(key: string): StoredDraft | null {
  if (!key) return null;
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) as StoredDraft : null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}
