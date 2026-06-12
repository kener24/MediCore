import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Eye, Pencil, Plus, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { deactivateDoctor, getDoctors, getSpecialties } from "../../api/doctorsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { SpecialtyBadge } from "../../components/ui/SpecialtyBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { DoctorProfile, MedicalSpecialty } from "../../types/doctor";

export function ClinicDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [confirmDoctor, setConfirmDoctor] = useState<DoctorProfile | null>(null);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [doctorData, specialtyData] = await Promise.all([
        getDoctors({ search: search || undefined, specialty: specialty || undefined, is_active: statusFilter || undefined }),
        getSpecialties({ is_active: "true" }),
      ]);
      setDoctors(doctorData);
      setSpecialties(specialtyData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Medicos | MediCore";
    load();
  }, []);

  async function deactivate() {
    if (!confirmDoctor) return;
    setSaving(true);
    try {
      await deactivateDoctor(confirmDoctor.id);
      toast.success("Medico desactivado correctamente.");
      setConfirmDoctor(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicos"
        description="Perfiles profesionales y agenda de atencion."
        actions={
          <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to="/clinic/doctors/new">
            <Plus className="h-4 w-4" />
            Nuevo medico
          </Link>
        }
      />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_170px_auto]">
          <SearchInput placeholder="Buscar medico, email o colegiacion" value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectFilter value={specialty} onChange={(event) => setSpecialty(event.target.value)} options={[{ label: "Todas", value: "" }, ...specialties.map((item) => ({ label: item.nombre, value: String(item.id) }))]} />
          <SelectFilter value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={[{ label: "Todos", value: "" }, { label: "Activos", value: "true" }, { label: "Inactivos", value: "false" }]} />
          <Button variant="secondary" onClick={load}>Filtrar</Button>
        </div>
        {loading ? <Loader /> : doctors.length ? (
          <Table
            data={doctors}
            columns={[
              { key: "doctor", header: "Medico", render: (doctor) => <span className="font-medium text-slate-900">{doctor.user_nombre}</span> },
              { key: "email", header: "Email", render: (doctor) => doctor.user_email },
              { key: "telefono", header: "Telefono", render: (doctor) => doctor.user_telefono || "Sin telefono" },
              { key: "specialty", header: "Especialidad", render: (doctor) => <SpecialtyBadge specialty={doctor.specialty_nombre} /> },
              { key: "colegiacion", header: "Colegiacion", render: (doctor) => doctor.numero_colegiacion },
              { key: "tarifa", header: "Tarifa", render: (doctor) => `L ${doctor.tarifa_consulta}` },
              { key: "duracion", header: "Duracion", render: (doctor) => `${doctor.duracion_consulta_minutos} min` },
              { key: "estado", header: "Estado", render: (doctor) => <StatusBadge active={doctor.activo} /> },
              { key: "acciones", header: "Acciones", render: (doctor) => (
                <div className="flex gap-2">
                  <Link className="rounded-md border border-slate-200 p-2 text-slate-600" to={`/clinic/doctors/${doctor.id}`}><Eye className="h-4 w-4" /></Link>
                  <Link className="rounded-md border border-slate-200 p-2 text-slate-600" to={`/clinic/doctors/${doctor.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                  <Link className="rounded-md border border-slate-200 p-2 text-slate-600" to={`/clinic/doctors/${doctor.id}/schedules`}><CalendarClock className="h-4 w-4" /></Link>
                  {doctor.activo ? <button className="rounded-md border border-rose-200 p-2 text-rose-600" onClick={() => setConfirmDoctor(doctor)}><PowerOff className="h-4 w-4" /></button> : null}
                </div>
              ) },
            ]}
          />
        ) : <EmptyState title="No hay medicos para mostrar." description="Crea perfiles para usuarios con rol medico." />}
      </Card>
      <ConfirmModal open={Boolean(confirmDoctor)} title="Desactivar medico" description={`Desactivar perfil de ${confirmDoctor?.user_nombre ?? "medico"}.`} confirmLabel="Desactivar" tone="danger" isLoading={saving} onClose={() => setConfirmDoctor(null)} onConfirm={deactivate} />
    </div>
  );
}
