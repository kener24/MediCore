import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Edit3, Eye, Save, Trash2 } from "lucide-react";

import {
  createBirthdayExamRecord,
  deleteBirthdayExamRecord,
  getBirthdayExamRecord,
  getBirthdayExamRecords,
  updateBirthdayExamRecord,
  type BirthdayExamRecord,
} from "../../api/patientsApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";

const emptyForm = { nombre: "", fecha_cumpleanos: "", telefono: "" };

export function BirthdayExamPage() {
  const [records, setRecords] = useState<BirthdayExamRecord[]>([]);
  const [selected, setSelected] = useState<BirthdayExamRecord | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editing = useMemo(() => editingId !== null, [editingId]);

  async function load() {
    setLoading(true);
    try {
      setRecords(await getBirthdayExamRecords());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Cumpleaños | MediCore";
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        fecha_cumpleanos: form.fecha_cumpleanos,
        telefono: form.telefono.trim(),
      };
      if (editingId) {
        const updated = await updateBirthdayExamRecord(editingId, payload);
        setSelected(updated);
        toast.success("Registro actualizado.");
      } else {
        const created = await createBirthdayExamRecord(payload);
        setSelected(created);
        toast.success("Registro guardado.");
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function showDetails(id: number) {
    try {
      setSelected(await getBirthdayExamRecord(id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function startEdit(record: BirthdayExamRecord) {
    setEditingId(record.id);
    setForm({
      nombre: record.nombre,
      fecha_cumpleanos: record.fecha_cumpleanos,
      telefono: record.telefono,
    });
  }

  async function remove(record: BirthdayExamRecord) {
    if (!window.confirm(`¿Eliminar el registro de ${record.nombre}?`)) return;
    try {
      await deleteBirthdayExamRecord(record.id);
      if (selected?.id === record.id) setSelected(null);
      if (editingId === record.id) resetForm();
      toast.success("Registro eliminado.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cumpleaños"
        description="Vista temporal de examen usando la tabla existente de pacientes."
        actions={<Link className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard">Regresar al menú principal</Link>}
      />

      <Card>
        <form className="grid gap-4 md:grid-cols-[1fr_220px_220px_auto]" onSubmit={submit}>
          <Input label="Nombre" required value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
          <Input label="Fecha de cumpleaños" required type="date" value={form.fecha_cumpleanos} onChange={(event) => setForm((current) => ({ ...current, fecha_cumpleanos: event.target.value }))} />
          <Input label="Telefono" value={form.telefono} onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))} />
          <div className="flex items-end gap-2">
            <Button className="w-full" icon={<Save className="h-4 w-4" />} isLoading={saving} type="submit">{editing ? "Editar" : "Guardar"}</Button>
            {editing ? <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Registros guardados</h2>
          {loading ? <Loader label="Cargando registros..." /> : null}
          {!loading && records.length === 0 ? <EmptyState title="No hay registros" description="Guarda el primer cumpleaños para el examen." /> : null}
          {!loading && records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Fecha de cumpleaños</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3">Opciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.nombre}</td>
                      <td className="px-4 py-3">{record.fecha_cumpleanos}</td>
                      <td className="px-4 py-3">{record.telefono || "Sin telefono"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button icon={<Eye className="h-4 w-4" />} type="button" variant="outline" onClick={() => showDetails(record.id)}>Ver</Button>
                          <Button icon={<Edit3 className="h-4 w-4" />} type="button" variant="secondary" onClick={() => startEdit(record)}>Editar</Button>
                          <Button icon={<Trash2 className="h-4 w-4" />} type="button" variant="danger" onClick={() => remove(record)}>Eliminar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">Detalle</h2>
          {selected ? (
            <div className="mt-4 space-y-3 text-sm">
              <Detail label="Nombre" value={selected.nombre} />
              <Detail label="Fecha de cumpleaños" value={selected.fecha_cumpleanos} />
              <Detail label="Telefono" value={selected.telefono || "Sin telefono"} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Selecciona un registro para ver detalles.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
