import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createConsultationDiagnosis, createConsultationMedicalOrder, createConsultationPrescription, createPrescriptionItem, getConsultationDiagnoses, getConsultationMedicalOrders, getConsultationPrescriptions, issuePrescription } from "../../api/prescriptionsApi";
import { MedicalOrderPriorityBadge, MedicalOrderStatusBadge, PrescriptionStatusBadge } from "../../components/ui/PrescriptionStatusBadge";
import { Card } from "../../components/ui/Card";
import type { Diagnosis, MedicalOrder, MedicalOrderPriority, MedicalOrderType, Prescription } from "../../types/prescription";

export function ClinicalOrdersSection({ consultationId, canEdit }: { consultationId: number; canEdit: boolean }) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [diagnosisName, setDiagnosisName] = useState("");
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [medication, setMedication] = useState({ prescription: "", medication_name: "", dosage: "", frequency: "" });
  const [order, setOrder] = useState<{ title: string; order_type: MedicalOrderType; priority: MedicalOrderPriority }>({ title: "", order_type: "laboratorio", priority: "normal" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [diagnosisData, prescriptionData, orderData] = await Promise.all([
        getConsultationDiagnoses(consultationId),
        getConsultationPrescriptions(consultationId),
        getConsultationMedicalOrders(consultationId),
      ]);
      setDiagnoses(diagnosisData);
      setPrescriptions(prescriptionData);
      setOrders(orderData);
      if (!medication.prescription && prescriptionData[0]) setMedication((current) => ({ ...current, prescription: String(prescriptionData[0].id) }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  useEffect(() => { load(); }, [consultationId]);

  async function submitDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await createConsultationDiagnosis(consultationId, { name: diagnosisName, diagnosis_type: "presuntivo", is_primary: !diagnoses.some((item) => item.is_primary) });
      toast.success("Diagnostico creado correctamente.");
      setDiagnosisName("");
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  async function submitPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await createConsultationPrescription(consultationId, { general_instructions: prescriptionInstructions });
      toast.success("Receta creada correctamente.");
      setPrescriptionInstructions("");
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  async function submitMedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!medication.prescription) return;
    setSaving(true);
    try {
      await createPrescriptionItem(medication.prescription, medication);
      toast.success("Medicamento agregado correctamente.");
      setMedication((current) => ({ prescription: current.prescription, medication_name: "", dosage: "", frequency: "" }));
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  async function issue(id: number) {
    setSaving(true);
    try {
      await issuePrescription(id);
      toast.success("Receta emitida correctamente.");
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await createConsultationMedicalOrder(consultationId, order);
      toast.success("Orden medica creada correctamente.");
      setOrder({ title: "", order_type: "laboratorio", priority: "normal" });
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Card title="Diagnosticos">
        <div className="space-y-3">
          {diagnoses.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><p className="font-semibold text-slate-900">{item.is_primary ? "Principal: " : ""}{item.name}</p><p className="text-sm text-slate-500">{item.code || "Sin codigo"} | {item.diagnosis_type}</p></div>)}
          {!diagnoses.length ? <p className="text-sm text-slate-500">No hay diagnosticos registrados.</p> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitDiagnosis}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Nombre del diagnostico" required value={diagnosisName} onChange={(event) => setDiagnosisName(event.target.value)} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" disabled={saving}>Agregar</button></form> : null}
        </div>
      </Card>

      <Card title="Recetas">
        <div className="space-y-4">
          {prescriptions.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{item.prescription_number}</p><PrescriptionStatusBadge status={item.status} /></div><p className="text-sm text-slate-600">{item.general_instructions || "Sin instrucciones generales"}</p><p className="text-sm text-slate-500">Medicamentos: {item.medications?.join(", ") || "sin medicamentos"}</p>{canEdit && item.status === "borrador" ? <button className="mt-2 rounded-md border px-3 py-1 text-xs font-semibold" disabled={saving} onClick={() => issue(item.id)}>Emitir receta</button> : null}</div>)}
          {!prescriptions.length ? <p className="text-sm text-slate-500">No hay recetas registradas.</p> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitPrescription}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Instrucciones generales" value={prescriptionInstructions} onChange={(event) => setPrescriptionInstructions(event.target.value)} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" disabled={saving}>Crear receta</button></form> : null}
          {canEdit && prescriptions.length ? <form className="grid gap-2 md:grid-cols-4" onSubmit={submitMedication}><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={medication.prescription} onChange={(event) => setMedication((current) => ({ ...current, prescription: event.target.value }))}>{prescriptions.map((item) => <option key={item.id} value={item.id}>{item.prescription_number}</option>)}</select><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Medicamento" required value={medication.medication_name} onChange={(event) => setMedication((current) => ({ ...current, medication_name: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Dosis" required value={medication.dosage} onChange={(event) => setMedication((current) => ({ ...current, dosage: event.target.value }))} /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Frecuencia" required value={medication.frequency} onChange={(event) => setMedication((current) => ({ ...current, frequency: event.target.value }))} /><button className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white md:col-span-4" disabled={saving}>Agregar medicamento</button></form> : null}
        </div>
      </Card>

      <Card title="Ordenes medicas">
        <div className="space-y-3">
          {orders.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{item.order_number} | {item.title}</p><div className="flex gap-2"><MedicalOrderPriorityBadge priority={item.priority} /><MedicalOrderStatusBadge status={item.status} /></div></div><p className="text-sm text-slate-500">{item.order_type}</p></div>)}
          {!orders.length ? <p className="text-sm text-slate-500">No hay ordenes registradas.</p> : null}
          {canEdit ? <form className="grid gap-2 md:grid-cols-[1fr_160px_150px_auto]" onSubmit={submitOrder}><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Titulo de orden" required value={order.title} onChange={(event) => setOrder((current) => ({ ...current, title: event.target.value }))} /><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={order.order_type} onChange={(event) => setOrder((current) => ({ ...current, order_type: event.target.value as MedicalOrderType }))}><option value="laboratorio">Laboratorio</option><option value="imagenologia">Imagenologia</option><option value="procedimiento">Procedimiento</option><option value="interconsulta">Interconsulta</option><option value="otro">Otro</option></select><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={order.priority} onChange={(event) => setOrder((current) => ({ ...current, priority: event.target.value as MedicalOrderPriority }))}><option value="normal">Normal</option><option value="baja">Baja</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" disabled={saving}>Crear</button></form> : null}
        </div>
      </Card>
    </div>
  );
}
