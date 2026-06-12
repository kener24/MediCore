import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { createClinic, getClinics, updateClinic } from "../../api/clinicsApi";
import { getErrorMessage } from "../../api/axios";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";
import type { Clinic, ClinicPayload } from "../../types/clinic";
import { ClinicForm } from "./ClinicForm";

export function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setClinics(await getClinics());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Clínicas | MediCore";
    load();
  }, []);

  function openCreate() {
    setSelectedClinic(null);
    setModalOpen(true);
  }

  function openEdit(clinic: Clinic) {
    setSelectedClinic(clinic);
    setModalOpen(true);
  }

  async function handleSubmit(payload: ClinicPayload) {
    setSaving(true);
    try {
      if (selectedClinic) {
        await updateClinic(selectedClinic.id, payload);
        toast.success("Clínica actualizada correctamente.");
      } else {
        await createClinic(payload);
        toast.success("Clínica creada correctamente.");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clínicas</h1>
          <p className="mt-1 text-sm text-slate-500">Catálogo de clínicas dentro de MediCore.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva clínica
        </Button>
      </div>
      <Card>
        <Table
          data={clinics}
          emptyMessage="No hay clínicas registradas."
          columns={[
            { key: "name", header: "Nombre", render: (clinic) => <span className="font-medium text-slate-900">{clinic.nombre}</span> },
            { key: "rtn", header: "RTN", render: (clinic) => clinic.rtn || "Sin RTN" },
            { key: "phone", header: "Teléfono", render: (clinic) => clinic.telefono || "Sin teléfono" },
            { key: "email", header: "Correo", render: (clinic) => clinic.correo || "Sin correo" },
            { key: "address", header: "Dirección", render: (clinic) => clinic.direccion || "Sin dirección" },
            { key: "status", header: "Estado", render: (clinic) => <Badge tone={clinic.activo ? "active" : "inactive"}>{clinic.activo ? "Activa" : "Inactiva"}</Badge> },
            {
              key: "actions",
              header: "Acciones",
              render: (clinic) => (
                <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => openEdit(clinic)} type="button" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={selectedClinic ? "Editar clínica" : "Nueva clínica"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        actions={<ModalCloseButton onClick={() => setModalOpen(false)} />}
      >
        <ClinicForm clinic={selectedClinic} isSubmitting={saving} onSubmit={handleSubmit} />
      </Modal>
    </div>
  );
}
