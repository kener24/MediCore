import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { DoctorPayload, DoctorProfile, MedicalSpecialty } from "../../types/doctor";
import type { User } from "../../types/user";

interface DoctorFormProps {
  doctor?: DoctorProfile | null;
  users: User[];
  specialties: MedicalSpecialty[];
  isSubmitting?: boolean;
  onSubmit: (payload: DoctorPayload) => void | Promise<void>;
}

export function DoctorForm({ doctor, users, specialties, isSubmitting, onSubmit }: DoctorFormProps) {
  const isEditing = Boolean(doctor);
  const { register, handleSubmit } = useForm<DoctorPayload>({
    defaultValues: {
      user: doctor?.user,
      specialty: doctor?.specialty ?? specialties[0]?.id,
      numero_colegiacion: doctor?.numero_colegiacion ?? "",
      titulo_profesional: doctor?.titulo_profesional ?? "",
      biografia: doctor?.biografia ?? "",
      tarifa_consulta: doctor?.tarifa_consulta ?? "0.00",
      duracion_consulta_minutos: doctor?.duracion_consulta_minutos ?? 30,
      atiende_virtual: doctor?.atiende_virtual ?? false,
      atiende_presencial: doctor?.atiende_presencial ?? true,
      activo: doctor?.activo ?? true,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        {!isEditing ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Usuario medico</span>
            <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("user", { valueAsNumber: true, required: true })}>
              <option value="">Seleccionar usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre_completo} - {user.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Especialidad</span>
          <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("specialty", { valueAsNumber: true, required: true })}>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.nombre}
              </option>
            ))}
          </select>
        </label>
        <Input label="Numero de colegiacion" required {...register("numero_colegiacion", { required: true })} />
        <Input label="Titulo profesional" {...register("titulo_profesional")} />
        <Input label="Tarifa consulta" type="number" min="0" step="0.01" {...register("tarifa_consulta", { required: true })} />
        <Input label="Duracion consulta (min)" type="number" min="1" {...register("duracion_consulta_minutos", { valueAsNumber: true, required: true })} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Biografia</span>
        <textarea className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" {...register("biografia")} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4" {...register("atiende_presencial")} />
          Atiende presencial
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4" {...register("atiende_virtual")} />
          Atiende virtual
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4" {...register("activo")} />
          Activo
        </label>
      </div>
      <Button type="submit" isLoading={isSubmitting}>
        {isEditing ? "Guardar cambios" : "Crear perfil medico"}
      </Button>
    </form>
  );
}
