import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getMyClinic, updateMyClinic } from "../../api/clinicAdminApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Clinic } from "../../types/clinic";
import type { MyClinicUpdatePayload } from "../../types/clinicAdmin";
import { digitInputProps, onlyDigits, onlyPhoneChars, phoneInputProps } from "../../utils/inputSanitizers";

export function MyClinicPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [form, setForm] = useState<MyClinicUpdatePayload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getMyClinic();
      setClinic(data);
      setForm({
        nombre: data.nombre,
        rtn: data.rtn,
        telefono: data.telefono,
        correo: data.correo,
        direccion: data.direccion,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Mi Clinica | MediCore";
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateMyClinic(form);
      setClinic(updated);
      setEditing(false);
      toast.success("Clinica actualizada correctamente.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  if (!clinic) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Mi Clinica"
        description="Informacion basica visible para tu equipo."
        actions={
          editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button isLoading={saving} onClick={save}>
                Guardar cambios
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          )
        }
      />
      <Card>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nombre" value={form.nombre ?? ""} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
              <Input label="RTN" maxLength={20} value={form.rtn ?? ""} {...digitInputProps} onChange={(event) => setForm({ ...form, rtn: onlyDigits(event.target.value) })} />
              <Input label="Correo" type="email" value={form.correo ?? ""} onChange={(event) => setForm({ ...form, correo: event.target.value })} />
              <Input label="Telefono" maxLength={30} value={form.telefono ?? ""} {...phoneInputProps} onChange={(event) => setForm({ ...form, telefono: onlyPhoneChars(event.target.value) })} />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Direccion</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                value={form.direccion ?? ""}
                onChange={(event) => setForm({ ...form, direccion: event.target.value })}
              />
            </label>
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Nombre" value={clinic.nombre} />
            <Info label="RTN" value={clinic.rtn || "Sin RTN"} />
            <Info label="Correo" value={clinic.correo || "Sin correo"} />
            <Info label="Telefono" value={clinic.telefono || "Sin telefono"} />
            <Info label="Direccion" value={clinic.direccion || "Sin direccion"} />
            <div className="rounded-md bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
              <dd className="mt-1">
                <StatusBadge active={clinic.activo} activeText="Activa" inactiveText="Inactiva" />
              </dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
