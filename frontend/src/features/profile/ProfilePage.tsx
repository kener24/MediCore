import { useEffect, useState, type FormEvent } from "react";
import { Edit3, Save, X } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { updateMe } from "../../api/authApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { formatDate } from "../../utils/formatDate";

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre_completo: "", telefono: "", avatar_url: "" });

  useEffect(() => {
    document.title = "Perfil | MediCore";
    refreshMe().catch(() => undefined);
  }, [refreshMe]);

  useEffect(() => {
    if (user) {
      setForm({
        nombre_completo: user.nombre_completo ?? "",
        telefono: user.telefono ?? "",
        avatar_url: user.avatar_url ?? "",
      });
    }
  }, [user]);

  if (!user) return null;

  const currentUser = user;
  const role = currentUser.role_nombre ?? (typeof currentUser.role === "object" ? currentUser.role.nombre : "Sin rol");
  const clinic = currentUser.clinica_nombre ?? (typeof currentUser.clinica === "object" && currentUser.clinica ? currentUser.clinica.nombre : "Sin clinica");
  const initials = currentUser.nombre_completo.slice(0, 2).toUpperCase();

  const fields = [
    ["Nombre completo", currentUser.nombre_completo],
    ["Email", currentUser.email],
    ["Telefono", currentUser.telefono || "Sin telefono"],
    ["Avatar URL", currentUser.avatar_url || "Sin avatar"],
    ["Rol", role],
    ["Clinica", clinic],
    ["Ultimo acceso", formatDate(currentUser.ultimo_acceso)],
    ["Estado", currentUser.is_active ? "Activo" : "Inactivo"],
  ];

  function cancel() {
    setForm({
      nombre_completo: currentUser.nombre_completo ?? "",
      telefono: currentUser.telefono ?? "",
      avatar_url: currentUser.avatar_url ?? "",
    });
    setEditing(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nombre_completo.trim()) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await updateMe({
        nombre_completo: form.nombre_completo.trim(),
        telefono: form.telefono.trim(),
        avatar_url: form.avatar_url.trim(),
      });
      await refreshMe();
      setEditing(false);
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Perfil"
        description="Informacion personal del usuario autenticado."
        actions={
          editing ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" icon={<X className="h-4 w-4" />} onClick={cancel}>Cancelar</Button>
              <Button form="profile-form" type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Guardar</Button>
            </div>
          ) : (
            <Button type="button" icon={<Edit3 className="h-4 w-4" />} onClick={() => setEditing(true)}>Editar</Button>
          )
        }
      />
      <Card>
        <div className="mb-6 flex items-center gap-4">
          {currentUser.avatar_url ? (
            <img className="h-16 w-16 rounded-full object-cover" src={currentUser.avatar_url} alt={currentUser.nombre_completo} />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-700">{initials}</div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{currentUser.nombre_completo}</h2>
            <div className="mt-1 flex gap-2">
              <Badge tone="role">{role}</Badge>
              <Badge tone={currentUser.is_active ? "active" : "inactive"}>{currentUser.is_active ? "Activo" : "Inactivo"}</Badge>
            </div>
          </div>
        </div>
        {editing ? (
          <form id="profile-form" className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre completo" required value={form.nombre_completo} onChange={(event) => setForm({ ...form, nombre_completo: event.target.value })} />
              <Input label="Telefono" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
              <Input className="sm:col-span-2" label="Avatar URL" placeholder="https://..." value={form.avatar_url} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} />
            </div>
            <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
              Email, rol, clinica, estado y permisos son campos protegidos. Solo un administrador puede modificarlos desde gestion de usuarios.
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
