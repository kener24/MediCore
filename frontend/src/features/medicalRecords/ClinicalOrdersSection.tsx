import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FileText, Play, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import {
  cancelMedicalOrder,
  completeMedicalOrderWithResult,
  createConsultationDiagnosis,
  createConsultationMedicalOrder,
  createConsultationPrescription,
  createPrescriptionItem,
  getConsultationDiagnoses,
  getConsultationMedicalOrders,
  getConsultationPrescriptions,
  issuePrescription,
  openPrescriptionPdf,
  reviewMedicalOrder,
  startMedicalOrder,
} from "../../api/prescriptionsApi";
import { MedicalOrderPriorityBadge, MedicalOrderStatusBadge, PrescriptionStatusBadge } from "../../components/ui/PrescriptionStatusBadge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import type { Diagnosis, MedicalOrder, MedicalOrderPriority, MedicalOrderType, Prescription } from "../../types/prescription";

const emptyMedication = { prescription: "", medication_name: "", presentation: "", dosage: "", frequency: "", duration: "", quantity: "", route: "oral", instructions: "" };
const emptyOrder: { title: string; description: string; instructions: string; order_type: MedicalOrderType; priority: MedicalOrderPriority; expires_at: string; execution_area: string } = { title: "", description: "", instructions: "", order_type: "laboratorio", priority: "normal", expires_at: "", execution_area: "" };

export function ClinicalOrdersSection({ consultationId, canEdit }: { consultationId: number; canEdit: boolean }) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [diagnosisName, setDiagnosisName] = useState("");
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [medication, setMedication] = useState(emptyMedication);
  const [order, setOrder] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [diagnosisData, prescriptionData, orderData] = await Promise.all([
        getConsultationDiagnoses(consultationId),
        getConsultationPrescriptions(consultationId),
        getConsultationMedicalOrders(consultationId),
      ]);
      setDiagnoses(diagnosisData);
      setPrescriptions(prescriptionData);
      setOrders(orderData);
      const firstDraft = prescriptionData.find((item) => item.status === "borrador");
      setMedication((current) => ({ ...current, prescription: firstDraft ? String(firstDraft.id) : "" }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [consultationId]);

  useEffect(() => { void load(); }, [load]);

  async function run(action: () => Promise<unknown>, success: string) {
    if (saving) return;
    setSaving(true);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  }

  async function submitDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await createConsultationDiagnosis(consultationId, { name: diagnosisName.trim(), diagnosis_type: "presuntivo", is_primary: !diagnoses.some((item) => item.is_primary) });
      setDiagnosisName("");
    }, "Diagnóstico creado correctamente.");
  }

  async function submitPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await createConsultationPrescription(consultationId, { general_instructions: prescriptionInstructions.trim() });
      setPrescriptionInstructions("");
    }, "Receta creada correctamente.");
  }

  async function submitMedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!medication.prescription) return;
    await run(async () => {
      const created = await createPrescriptionItem(medication.prescription, medication);
      if (created.allergy_warnings?.length) toast.warning(`Alerta de alergia relacionada: ${created.allergy_warnings.join(", ")}.`);
      setMedication({ ...emptyMedication, prescription: medication.prescription });
    }, "Medicamento agregado correctamente.");
  }

  async function issue(id: number) {
    if (saving) return;
    setSaving(true);
    try {
      await issuePrescription(id);
      toast.success("Receta emitida correctamente.");
      await load();
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("alergia") && window.confirm(`${message}\n\n¿Deseas continuar bajo tu criterio médico?`)) {
        const reason = window.prompt("Justificación clínica obligatoria para confirmar la alerta:")?.trim() ?? "";
        if (reason.length >= 8) {
          try {
            await issuePrescription(id, { confirm_allergies: true, allergy_override_reason: reason });
            toast.success("Receta emitida con alerta de alergia confirmada.");
            await load();
          } catch (confirmError) { toast.error(getErrorMessage(confirmError)); }
        } else if (reason) toast.error("La justificación debe tener al menos 8 caracteres.");
      } else toast.error(message);
    } finally { setSaving(false); }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await createConsultationMedicalOrder(consultationId, { ...order, expires_at: order.expires_at ? new Date(order.expires_at).toISOString() : null });
      setOrder(emptyOrder);
    }, "Orden médica creada correctamente.");
  }

  async function operateOrder(item: MedicalOrder, action: "start" | "complete" | "review" | "cancel") {
    if (action === "start") return run(() => startMedicalOrder(item.id), "Orden iniciada correctamente.");
    if (action === "complete") {
      const result = window.prompt("Resultado resumido de la orden:")?.trim() ?? "";
      if (result.length < 3) return toast.error("Registra un resultado resumido.");
      return run(() => completeMedicalOrderWithResult(item.id, result), "Orden completada correctamente.");
    }
    if (action === "review") {
      const notes = window.prompt("Observación médica de revisión (opcional):")?.trim() ?? "";
      return run(() => reviewMedicalOrder(item.id, notes), "Resultado marcado como revisado.");
    }
    const reason = window.prompt("Motivo de cancelación:")?.trim() ?? "";
    if (reason.length < 5) return toast.error("El motivo debe tener al menos 5 caracteres.");
    return run(() => cancelMedicalOrder(item.id, reason), "Orden cancelada correctamente.");
  }

  const draftPrescriptions = prescriptions.filter((item) => item.status === "borrador");

  return (
    <div className="space-y-6">
      <Card title="Diagnósticos">
        <div className="space-y-3">
          {diagnoses.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><p className="font-semibold text-slate-900">{item.is_primary ? "Principal: " : ""}{item.name}</p><p className="text-sm text-slate-500">{item.code || "Sin código"} | {item.diagnosis_type}</p></div>)}
          {!diagnoses.length ? <EmptyState title="No hay diagnósticos registrados." description="Los diagnósticos de la consulta aparecerán aquí." /> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitDiagnosis}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Nombre del diagnóstico" required value={diagnosisName} onChange={(event) => setDiagnosisName(event.target.value)} /><Button disabled={saving}>Agregar</Button></form> : null}
        </div>
      </Card>

      <Card title="Recetas médicas">
        <div className="space-y-4">
          {prescriptions.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{item.prescription_number}</p><PrescriptionStatusBadge status={item.status} /></div><p className="text-sm text-slate-600">{item.general_instructions || "Sin instrucciones generales"}</p><p className="text-sm text-slate-500">Medicamentos: {item.medications?.join(", ") || "sin medicamentos"}</p><div className="mt-2 flex flex-wrap gap-2">{canEdit && item.status === "borrador" ? <Button className="h-8 px-3 text-xs" disabled={saving} onClick={() => issue(item.id)} type="button"><ShieldAlert className="h-3.5 w-3.5" />Emitir</Button> : null}{item.status === "emitida" ? <Button className="h-8 px-3 text-xs" onClick={() => openPrescriptionPdf(item.id).catch((error) => toast.error(getErrorMessage(error)))} type="button" variant="outline"><FileText className="h-3.5 w-3.5" />PDF</Button> : null}</div></div>)}
          {!prescriptions.length ? <EmptyState title="No hay recetas asociadas a esta consulta." description="Crea una receta cuando el tratamiento lo requiera." /> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitPrescription}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Instrucciones generales" value={prescriptionInstructions} onChange={(event) => setPrescriptionInstructions(event.target.value)} /><Button disabled={saving}>Crear receta</Button></form> : null}
          {canEdit && draftPrescriptions.length ? <form className="grid gap-2 md:grid-cols-3" onSubmit={submitMedication}><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={medication.prescription} onChange={(event) => setMedication((current) => ({ ...current, prescription: event.target.value }))}>{draftPrescriptions.map((item) => <option key={item.id} value={item.id}>{item.prescription_number}</option>)}</select><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Medicamento" required value={medication.medication_name} onChange={(event) => setMedication((current) => ({ ...current, medication_name: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Presentación" value={medication.presentation} onChange={(event) => setMedication((current) => ({ ...current, presentation: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Dosis" required value={medication.dosage} onChange={(event) => setMedication((current) => ({ ...current, dosage: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Frecuencia" required value={medication.frequency} onChange={(event) => setMedication((current) => ({ ...current, frequency: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Duración" value={medication.duration} onChange={(event) => setMedication((current) => ({ ...current, duration: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" min="0.01" placeholder="Cantidad" type="number" value={medication.quantity} onChange={(event) => setMedication((current) => ({ ...current, quantity: event.target.value }))} /><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={medication.route} onChange={(event) => setMedication((current) => ({ ...current, route: event.target.value }))}><option value="oral">Oral</option><option value="intravenosa">Intravenosa</option><option value="intramuscular">Intramuscular</option><option value="topica">Tópica</option><option value="inhalada">Inhalada</option><option value="otra">Otra</option></select><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Indicaciones" value={medication.instructions} onChange={(event) => setMedication((current) => ({ ...current, instructions: event.target.value }))} /><Button className="md:col-span-3" disabled={saving}>Agregar medicamento</Button></form> : null}
        </div>
      </Card>

      <Card title="Órdenes médicas">
        <div className="space-y-3">
          {orders.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{item.order_number} | {item.title}</p><div className="flex gap-2"><MedicalOrderPriorityBadge priority={item.priority} /><MedicalOrderStatusBadge status={item.status} /></div></div><p className="text-sm text-slate-500">{item.order_type}{item.execution_area ? ` | ${item.execution_area}` : ""}</p>{item.expires_at ? <p className="text-xs text-slate-500">Vence: {new Date(item.expires_at).toLocaleString()}</p> : null}{item.result_summary ? <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">Resultado: {item.result_summary}</p> : null}<div className="mt-2 flex flex-wrap gap-2">{item.status === "pendiente" ? <Button className="h-8 px-3 text-xs" onClick={() => operateOrder(item, "start")} type="button" variant="outline"><Play className="h-3.5 w-3.5" />Iniciar</Button> : null}{item.status === "en_proceso" ? <Button className="h-8 px-3 text-xs" onClick={() => operateOrder(item, "complete")} type="button">Completar</Button> : null}{item.status === "completada" ? <Button className="h-8 px-3 text-xs" onClick={() => operateOrder(item, "review")} type="button">Marcar revisada</Button> : null}{["pendiente", "en_proceso"].includes(item.status) ? <Button className="h-8 px-3 text-xs" onClick={() => operateOrder(item, "cancel")} type="button" variant="danger">Cancelar</Button> : null}</div></div>)}
          {!orders.length ? <EmptyState title="No hay órdenes médicas registradas." description="Crea una orden cuando el paciente requiera estudios o procedimientos." /> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-3" onSubmit={submitOrder}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Título de la orden" required value={order.title} onChange={(event) => setOrder((current) => ({ ...current, title: event.target.value }))} /><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={order.order_type} onChange={(event) => setOrder((current) => ({ ...current, order_type: event.target.value as MedicalOrderType }))}><option value="laboratorio">Laboratorio</option><option value="imagenologia">Imagenología</option><option value="procedimiento">Procedimiento</option><option value="interconsulta">Interconsulta</option><option value="otro">Otro</option></select><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={order.priority} onChange={(event) => setOrder((current) => ({ ...current, priority: event.target.value as MedicalOrderPriority }))}><option value="normal">Normal</option><option value="baja">Baja</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Área de ejecución" value={order.execution_area} onChange={(event) => setOrder((current) => ({ ...current, execution_area: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" min={new Date().toISOString().slice(0, 16)} type="datetime-local" value={order.expires_at} onChange={(event) => setOrder((current) => ({ ...current, expires_at: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Instrucciones" value={order.instructions} onChange={(event) => setOrder((current) => ({ ...current, instructions: event.target.value }))} /><textarea className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Descripción" value={order.description} onChange={(event) => setOrder((current) => ({ ...current, description: event.target.value }))} /><Button disabled={saving}>Crear orden</Button></form> : null}
        </div>
      </Card>
    </div>
  );
}
