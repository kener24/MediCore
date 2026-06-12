import { useEffect, useState } from "react";
import { Pencil, PowerOff } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { createDoctorSchedule, deleteDoctorSchedule, getDoctor, getDoctorSchedules, updateDoctorSchedule } from "../../api/doctorsApi";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { DoctorProfile, DoctorSchedule, DoctorSchedulePayload } from "../../types/doctor";
import { ScheduleForm } from "./ScheduleForm";

export function DoctorSchedulesPage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [selected, setSelected] = useState<DoctorSchedule | null>(null);
  const [confirm, setConfirm] = useState<DoctorSchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [doctorData, scheduleData] = await Promise.all([getDoctor(id), getDoctorSchedules(id)]);
      setDoctor(doctorData);
      setSchedules(scheduleData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function save(payload: DoctorSchedulePayload) {
    if (!id) return;
    setSaving(true);
    try {
      if (selected) await updateDoctorSchedule(id, selected.id, payload);
      else await createDoctorSchedule(id, payload);
      toast.success(selected ? "Horario actualizado correctamente." : "Horario creado correctamente.");
      setModalOpen(false);
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!id || !confirm) return;
    setSaving(true);
    try {
      await deleteDoctorSchedule(id, confirm.id);
      toast.success("Horario desactivado correctamente.");
      setConfirm(null);
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
      <PageHeader title={`Horarios - ${doctor?.user_nombre ?? "Medico"}`} actions={<button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" onClick={() => { setSelected(null); setModalOpen(true); }}>Nuevo horario</button>} />
      <Card>
        <Table data={schedules} emptyMessage="No hay horarios registrados." columns={[
          { key: "dia", header: "Dia", render: (s) => s.dia_semana },
          { key: "inicio", header: "Hora inicio", render: (s) => s.hora_inicio.slice(0, 5) },
          { key: "fin", header: "Hora fin", render: (s) => s.hora_fin.slice(0, 5) },
          { key: "estado", header: "Estado", render: (s) => <StatusBadge active={s.activo} /> },
          { key: "acciones", header: "Acciones", render: (s) => <div className="flex gap-2"><button className="rounded-md border p-2" onClick={() => { setSelected(s); setModalOpen(true); }}><Pencil className="h-4 w-4" /></button>{s.activo ? <button className="rounded-md border border-rose-200 p-2 text-rose-600" onClick={() => setConfirm(s)}><PowerOff className="h-4 w-4" /></button> : null}</div> },
        ]} />
      </Card>
      <Modal title={selected ? "Editar horario" : "Nuevo horario"} open={modalOpen} onClose={() => setModalOpen(false)} actions={<ModalCloseButton onClick={() => setModalOpen(false)} />}>
        <ScheduleForm schedule={selected} isSubmitting={saving} onSubmit={save} />
      </Modal>
      <ConfirmModal open={Boolean(confirm)} title="Desactivar horario" description="Este horario dejara de estar activo." confirmLabel="Desactivar" tone="danger" isLoading={saving} onClose={() => setConfirm(null)} onConfirm={deactivate} />
    </div>
  );
}
