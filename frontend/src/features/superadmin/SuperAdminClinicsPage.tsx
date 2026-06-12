import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { activateClinic, createClinic, deactivateClinic, getClinics, updateClinic } from "../../api/clinicsApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { SearchInput } from "../../components/ui/SearchInput";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { Clinic, ClinicPayload } from "../../types/clinic";
import { ClinicForm } from "../clinics/ClinicForm";

export function SuperAdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [confirmClinic, setConfirmClinic] = useState<Clinic | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setClinics(await getClinics({ search: search || undefined, is_active: statusFilter || undefined }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Clinicas | Superadmin";
    load();
  }, []);

  const hasFilters = useMemo(() => Boolean(search || statusFilter), [search, statusFilter]);

  async function handleSubmit(payload: ClinicPayload) {
    setSaving(true);
    try {
      if (selectedClinic) {
        await updateClinic(selectedClinic.id, payload);
        toast.success("Clinica actualizada correctamente.");
      } else {
        await createClinic(payload);
        toast.success("Clinica creada correctamente.");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleClinic() {
    if (!confirmClinic) return;
    setSaving(true);
    try {
      if (confirmClinic.activo) {
        await deactivateClinic(confirmClinic.id);
        toast.success("Clinica desactivada correctamente.");
      } else {
        await activateClinic(confirmClinic.id);
        toast.success("Clinica activada correctamente.");
      }
      setConfirmClinic(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinicas</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion global de clientes del SaaS.</p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          to="/superadmin/clinics/new"
        >
          <Plus className="h-4 w-4" />
          Nueva clinica
        </Link>
      </div>
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px_auto]">
          <SearchInput placeholder="Buscar por nombre, correo o RTN" value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectFilter
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { label: "Todos los estados", value: "" },
              { label: "Activas", value: "true" },
              { label: "Inactivas", value: "false" },
            ]}
          />
          <Button type="button" variant="secondary" onClick={load}>
            Filtrar
          </Button>
        </div>
        {loading ? (
          <Loader />
        ) : clinics.length ? (
          <Table
            data={clinics}
            columns={[
              { key: "nombre", header: "Nombre", render: (clinic) => <span className="font-medium text-slate-900">{clinic.nombre}</span> },
              { key: "rtn", header: "RTN", render: (clinic) => clinic.rtn || "Sin RTN" },
              { key: "correo", header: "Correo", render: (clinic) => clinic.correo || "Sin correo" },
              { key: "telefono", header: "Telefono", render: (clinic) => clinic.telefono || "Sin telefono" },
              { key: "direccion", header: "Direccion", render: (clinic) => clinic.direccion || "Sin direccion" },
              { key: "estado", header: "Estado", render: (clinic) => <StatusBadge active={clinic.activo} activeText="Activa" inactiveText="Inactiva" /> },
              {
                key: "actions",
                header: "Acciones",
                render: (clinic) => (
                  <div className="flex gap-2">
                    <Link
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      to={`/superadmin/clinics/${clinic.id}/edit`}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => setConfirmClinic(clinic)}
                      type="button"
                      title={clinic.activo ? "Desactivar" : "Activar"}
                    >
                      {clinic.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="No hay clinicas para mostrar." description={hasFilters ? "Prueba con otros filtros de busqueda." : "Crea la primera clinica desde el boton superior."} />
        )}
      </Card>
      <Modal
        title={selectedClinic ? "Editar clinica" : "Nueva clinica"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        actions={<ModalCloseButton onClick={() => setModalOpen(false)} />}
      >
        <ClinicForm clinic={selectedClinic} isSubmitting={saving} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmModal
        open={Boolean(confirmClinic)}
        title={confirmClinic?.activo ? "Desactivar clinica" : "Activar clinica"}
        description={`Confirma esta accion para ${confirmClinic?.nombre ?? "la clinica seleccionada"}.`}
        confirmLabel={confirmClinic?.activo ? "Desactivar" : "Activar"}
        tone={confirmClinic?.activo ? "danger" : "primary"}
        isLoading={saving}
        onClose={() => setConfirmClinic(null)}
        onConfirm={toggleClinic}
      />
    </div>
  );
}
