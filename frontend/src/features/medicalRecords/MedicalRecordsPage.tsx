import { useEffect, useState } from "react";
import { Eye, FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createMedicalRecord, getMedicalRecords } from "../../api/medicalRecordsApi";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { PatientStatusBadge } from "../../components/ui/PatientStatusBadge";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { Table } from "../../components/ui/Table";
import type { MedicalRecord } from "../../types/medicalRecord";
import { formatDateOnly } from "./medicalRecordUtils";

export function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRecords(await getMedicalRecords({ search: search || undefined, is_active: isActive || undefined }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { document.title = "Expedientes | MediCore"; load(); }, []);

  async function createForPatient(patient: number) {
    try {
      const record = await createMedicalRecord({ patient });
      toast.success("Expediente creado correctamente.");
      window.location.href = `/clinic/medical-records/${record.id}`;
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expedientes" description="Historial clinico base de pacientes por clinica." />
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" placeholder="Buscar paciente, identidad, codigo o expediente" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <SelectFilter value={isActive} onChange={(event) => setIsActive(event.target.value)} options={[{ label: "Todos", value: "" }, { label: "Activos", value: "true" }, { label: "Inactivos", value: "false" }]} />
          <button className="h-10 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-700" onClick={load}>Filtrar</button>
        </div>
        {loading ? <Loader /> : records.length ? (
          <Table data={records} columns={[
            { key: "numero", header: "Expediente", render: (item) => <span className="font-semibold text-slate-900">{item.record_number}</span> },
            { key: "paciente", header: "Paciente", render: (item) => <div><p>{item.patient_nombre}</p><p className="text-xs text-slate-500">{item.patient_identidad || "Sin identidad"} | {item.patient_codigo}</p></div> },
            { key: "sangre", header: "Sangre", render: (item) => item.blood_type || "Sin dato" },
            { key: "estado", header: "Estado", render: (item) => <PatientStatusBadge active={item.activo} /> },
            { key: "fecha", header: "Creacion", render: (item) => formatDateOnly(item.creado_en?.slice(0, 10)) },
            { key: "acciones", header: "Acciones", render: (item) => <div className="flex gap-2"><Link className="rounded-md border p-2" to={`/clinic/medical-records/${item.id}`} title="Ver"><Eye className="h-4 w-4" /></Link><Link className="rounded-md border p-2" to={`/clinic/patients/${item.patient}/clinical-history`} title="Historial"><FileText className="h-4 w-4" /></Link></div> },
          ]} />
        ) : <EmptyState title="No hay expedientes para mostrar." description="Puedes crearlos desde el historial de un paciente o con el seed demo." />}
      </Card>
    </div>
  );
}
