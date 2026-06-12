import { useEffect, useState, type FormEvent } from "react";
import { Eye, Pencil, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { finalizeConsultation, getConsultations, getMyConsultations, voidConsultation } from "../../api/medicalRecordsApi";
import { ConsultationStatusBadge } from "../../components/ui/ConsultationStatusBadge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectFilter } from "../../components/ui/SelectFilter";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import type { ClinicalConsultation } from "../../types/medicalRecord";
import { consultationListPath, formatDateOnly, formatTime, roleNameFrom } from "./medicalRecordUtils";

export function ConsultationsPage({ doctorOnly = false }: { doctorOnly?: boolean }) {
  const { user } = useAuth();
  const roleName = roleNameFrom(user);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [voidingId, setVoidingId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const filters = { search: search || undefined, status: status || undefined, date: date || undefined };
      setConsultations(doctorOnly ? await getMyConsultations(filters) : await getConsultations(filters));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { document.title = "Consultas | MediCore"; load(); }, []);

  async function submitFinalize(e: FormEvent) {
    e.preventDefault();
    if (!finalizingId) return;
    try { await finalizeConsultation(finalizingId); toast.success("Consulta finalizada correctamente."); setFinalizingId(null); await load(); } catch (error) { toast.error(getErrorMessage(error)); }
  }

  async function submitVoid(e: FormEvent) {
    e.preventDefault();
    if (!voidingId || !voidReason.trim()) return;
    try { await voidConsultation(voidingId, voidReason.trim()); toast.success("Consulta anulada correctamente."); setVoidingId(null); setVoidReason(""); await load(); } catch (error) { toast.error(getErrorMessage(error)); }
  }

  const base = consultationListPath(roleName);
  return (
    <div className="space-y-6">
      <PageHeader title={doctorOnly ? "Mis consultas" : "Consultas clinicas"} description="Borradores, consultas finalizadas e historial medico." />
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[160px_170px_1fr_auto]">
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <SelectFilter value={status} onChange={(event) => setStatus(event.target.value)} options={[{ label: "Estado", value: "" }, { label: "Borrador", value: "borrador" }, { label: "Finalizada", value: "finalizada" }, { label: "Anulada", value: "anulada" }]} />
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" placeholder="Buscar paciente, medico, motivo o diagnostico" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <button className="h-10 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-700" onClick={load}>Filtrar</button>
        </div>
        {loading ? <Loader /> : consultations.length ? (
          <Table data={consultations} columns={[
            { key: "fecha", header: "Fecha", render: (item) => <div><p className="font-semibold text-slate-900">{formatDateOnly(item.consultation_date)}</p><p className="text-xs text-slate-500">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p></div> },
            { key: "paciente", header: "Paciente", render: (item) => item.patient_nombre },
            { key: "medico", header: "Medico", render: (item) => item.doctor_nombre },
            { key: "motivo", header: "Motivo", render: (item) => item.chief_complaint || "Sin motivo" },
            { key: "diagnostico", header: "Diagnostico", render: (item) => item.preliminary_diagnosis || "Sin diagnostico" },
            { key: "estado", header: "Estado", render: (item) => <ConsultationStatusBadge status={item.status} /> },
            { key: "acciones", header: "Acciones", render: (item) => <div className="flex flex-wrap gap-2"><Link className="rounded-md border p-2" to={`${base}/${item.id}`}><Eye className="h-4 w-4" /></Link>{item.status === "borrador" ? <Link className="rounded-md border p-2" to={`/clinic/consultations/${item.id}/edit`}><Pencil className="h-4 w-4" /></Link> : null}{roleName === "medico" && item.status === "borrador" ? <button className="rounded-md border px-2 text-xs font-semibold" onClick={() => setFinalizingId(item.id)}>Finalizar</button> : null}{["admin", "superadmin", "medico"].includes(roleName) && item.status !== "anulada" ? <button className="rounded-md border px-2 text-xs font-semibold text-rose-700" onClick={() => { setVoidingId(item.id); setVoidReason(""); }}>Anular</button> : null}</div> },
          ]} />
        ) : <EmptyState title="No hay consultas para mostrar." description="Inicia una consulta desde una cita medica." />}
      </Card>
      <Modal open={Boolean(finalizingId)} title="Finalizar consulta" onClose={() => setFinalizingId(null)} actions={<><ModalCloseButton onClick={() => setFinalizingId(null)} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" form="finalize-consultation-form" type="submit">Finalizar</button></>}>
        <form id="finalize-consultation-form" className="grid gap-4" onSubmit={submitFinalize}>
          <p className="text-sm text-slate-600">La consulta quedara cerrada y pasara al historial clinico.</p>
        </form>
      </Modal>
      <Modal open={Boolean(voidingId)} title="Anular consulta" onClose={() => setVoidingId(null)} actions={<><ModalCloseButton onClick={() => setVoidingId(null)} /><button className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white" form="void-consultation-form" type="submit">Anular</button></>}>
        <form id="void-consultation-form" className="grid gap-4" onSubmit={submitVoid}>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo de anulacion</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required value={voidReason} onChange={(event) => setVoidReason(event.target.value)} /></label>
        </form>
      </Modal>
    </div>
  );
}
