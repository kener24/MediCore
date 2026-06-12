import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getDiagnoses, getMedicalOrders, getMyDiagnoses, getMyMedicalOrders, getMyPrescriptions, getPrescriptions } from "../../api/prescriptionsApi";
import { ConsultationStatusBadge } from "../../components/ui/ConsultationStatusBadge";
import { MedicalOrderPriorityBadge, MedicalOrderStatusBadge, PrescriptionStatusBadge } from "../../components/ui/PrescriptionStatusBadge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table } from "../../components/ui/Table";
import type { Diagnosis, MedicalOrder, Prescription } from "../../types/prescription";

export function DiagnosesPage({ patientOnly = false }: { patientOnly?: boolean }) {
  const [items, setItems] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setItems(patientOnly ? await getMyDiagnoses() : await getDiagnoses()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [patientOnly]);
  return <div className="space-y-6"><PageHeader title={patientOnly ? "Mis diagnosticos" : "Diagnosticos"} description="Diagnosticos registrados en consultas clinicas." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "name", header: "Diagnostico", render: (item) => <div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.code || "Sin codigo"} | {item.diagnosis_type}</p></div> }, { key: "patient", header: "Paciente", render: (item) => item.patient_nombre }, { key: "doctor", header: "Medico", render: (item) => item.doctor_nombre }, { key: "primary", header: "Tipo", render: (item) => item.is_primary ? "Principal" : "Secundario" }, { key: "status", header: "Estado consulta", render: () => <ConsultationStatusBadge status="finalizada" /> }]} /> : <EmptyState title="No hay diagnosticos para mostrar." description="Se agregan desde el detalle de consulta." />}</Card></div>;
}

export function PrescriptionsPage({ patientOnly = false }: { patientOnly?: boolean }) {
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setItems(patientOnly ? await getMyPrescriptions() : await getPrescriptions()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [patientOnly]);
  return <div className="space-y-6"><PageHeader title={patientOnly ? "Mis recetas" : "Recetas"} description="Recetas medicas y medicamentos indicados." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "number", header: "Numero", render: (item) => <span className="font-semibold text-slate-900">{item.prescription_number}</span> }, { key: "patient", header: "Paciente", render: (item) => item.patient_nombre }, { key: "doctor", header: "Medico", render: (item) => item.doctor_nombre }, { key: "meds", header: "Medicamentos", render: (item) => item.medications?.join(", ") || "Sin medicamentos" }, { key: "status", header: "Estado", render: (item) => <PrescriptionStatusBadge status={item.status} /> }]} /> : <EmptyState title="No hay recetas para mostrar." description="Se crean desde el detalle de consulta." />}</Card></div>;
}

export function MedicalOrdersPage({ patientOnly = false }: { patientOnly?: boolean }) {
  const [items, setItems] = useState<MedicalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try { setItems(patientOnly ? await getMyMedicalOrders() : await getMedicalOrders()); } catch (error) { toast.error(getErrorMessage(error)); } finally { setLoading(false); }
    }
    load();
  }, [patientOnly]);
  return <div className="space-y-6"><PageHeader title={patientOnly ? "Mis ordenes medicas" : "Ordenes medicas"} description="Laboratorio, imagenologia y otros estudios." /><Card>{loading ? <Loader /> : items.length ? <Table data={items} columns={[{ key: "number", header: "Numero", render: (item) => <span className="font-semibold text-slate-900">{item.order_number}</span> }, { key: "title", header: "Titulo", render: (item) => item.title }, { key: "patient", header: "Paciente", render: (item) => item.patient_nombre }, { key: "type", header: "Tipo", render: (item) => item.order_type }, { key: "priority", header: "Prioridad", render: (item) => <MedicalOrderPriorityBadge priority={item.priority} /> }, { key: "status", header: "Estado", render: (item) => <MedicalOrderStatusBadge status={item.status} /> }]} /> : <EmptyState title="No hay ordenes para mostrar." description="Se crean desde el detalle de consulta." />}</Card></div>;
}
