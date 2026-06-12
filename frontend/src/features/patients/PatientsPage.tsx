import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { activatePatient, deactivatePatient, getPatients } from "../../api/patientsApi";
import { getErrorMessage } from "../../api/axios";
import { BloodTypeBadge } from "../../components/ui/BloodTypeBadge";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { GenderBadge } from "../../components/ui/GenderBadge";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { Table } from "../../components/ui/Table";
import { PatientStatusBadge } from "../../components/ui/PatientStatusBadge";
import type { Patient } from "../../types/patient";
import { formatDate } from "../../utils/formatDate";

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [confirm, setConfirm] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setPatients(await getPatients({ search: search || undefined, is_active: statusFilter || undefined, gender: gender || undefined, blood_type: bloodType || undefined }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { document.title = "Pacientes | MediCore"; load(); }, []);

  async function toggle() {
    if (!confirm) return;
    setSaving(true);
    try {
      if (confirm.activo) {
        await deactivatePatient(confirm.id);
        toast.success("Paciente desactivado correctamente.");
      } else {
        await activatePatient(confirm.id);
        toast.success("Paciente activado correctamente.");
      }
      setConfirm(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pacientes" description="Registro administrativo de pacientes." actions={<Link className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to="/clinic/patients/new"><Plus className="h-4 w-4" />Nuevo paciente</Link>} />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_160px_170px_170px_auto]">
          <SearchInput placeholder="Buscar por nombre, identidad, telefono, correo o codigo" value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectFilter value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ label: "Todos", value: "" }, { label: "Activos", value: "true" }, { label: "Inactivos", value: "false" }]} />
          <SelectFilter value={gender} onChange={(e) => setGender(e.target.value)} options={[{ label: "Genero", value: "" }, { label: "Masculino", value: "masculino" }, { label: "Femenino", value: "femenino" }, { label: "Otro", value: "otro" }]} />
          <SelectFilter value={bloodType} onChange={(e) => setBloodType(e.target.value)} options={[{ label: "Sangre", value: "" }, ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "desconocido"].map((v) => ({ label: v, value: v }))]} />
          <button className="h-10 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-700" onClick={load}>Filtrar</button>
        </div>
        {loading ? <Loader /> : patients.length ? (
          <Table data={patients} columns={[
            { key: "codigo", header: "Codigo", render: (p) => <span className="font-medium text-slate-900">{p.codigo_paciente}</span> },
            { key: "nombre", header: "Nombre completo", render: (p) => p.nombre_completo },
            { key: "identidad", header: "Identidad", render: (p) => p.identidad || "Sin identidad" },
            { key: "telefono", header: "Telefono", render: (p) => p.telefono || "Sin telefono" },
            { key: "correo", header: "Correo", render: (p) => p.correo || "Sin correo" },
            { key: "genero", header: "Genero", render: (p) => <GenderBadge gender={p.genero} /> },
            { key: "sangre", header: "Sangre", render: (p) => <BloodTypeBadge bloodType={p.tipo_sangre} /> },
            { key: "estado", header: "Estado", render: (p) => <PatientStatusBadge active={p.activo} /> },
            { key: "fecha", header: "Creacion", render: (p) => formatDate(p.creado_en) },
            { key: "acciones", header: "Acciones", render: (p) => <div className="flex gap-2"><Link className="rounded-md border p-2" to={`/clinic/patients/${p.id}`}><Eye className="h-4 w-4" /></Link><Link className="rounded-md border p-2" to={`/clinic/patients/${p.id}/edit`}><Pencil className="h-4 w-4" /></Link><button className="rounded-md border p-2" onClick={() => setConfirm(p)}>{p.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button></div> },
          ]} />
        ) : <EmptyState title="No hay pacientes para mostrar." description="Registra el primer paciente de la clinica." />}
      </Card>
      <ConfirmModal open={Boolean(confirm)} title={confirm?.activo ? "Desactivar paciente" : "Activar paciente"} description={`Confirma esta accion para ${confirm?.nombre_completo ?? "el paciente"}.`} confirmLabel={confirm?.activo ? "Desactivar" : "Activar"} tone={confirm?.activo ? "danger" : "primary"} isLoading={saving} onClose={() => setConfirm(null)} onConfirm={toggle} />
    </div>
  );
}
