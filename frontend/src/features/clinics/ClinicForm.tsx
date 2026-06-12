import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Clinic, ClinicPayload } from "../../types/clinic";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  rtn: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().email("Ingresa un correo válido.").or(z.literal("")),
  direccion: z.string().optional(),
  activo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ClinicFormProps {
  clinic?: Clinic | null;
  isSubmitting?: boolean;
  onSubmit: (payload: ClinicPayload) => Promise<void> | void;
}

export function ClinicForm({ clinic, isSubmitting, onSubmit }: ClinicFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: clinic?.nombre ?? "",
      rtn: clinic?.rtn ?? "",
      telefono: clinic?.telefono ?? "",
      correo: clinic?.correo ?? "",
      direccion: clinic?.direccion ?? "",
      activo: clinic?.activo ?? true,
    },
  });

  function submit(values: FormValues) {
    onSubmit({
      nombre: values.nombre,
      rtn: values.rtn ?? "",
      telefono: values.telefono ?? "",
      correo: values.correo ?? "",
      direccion: values.direccion ?? "",
      activo: values.activo,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
        <Input label="RTN" error={errors.rtn?.message} {...register("rtn")} />
        <Input label="Teléfono" error={errors.telefono?.message} {...register("telefono")} />
        <Input label="Correo" type="email" error={errors.correo?.message} {...register("correo")} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Dirección</span>
        <textarea className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" {...register("direccion")} />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input className="h-4 w-4 rounded border-slate-300 text-brand-600" type="checkbox" {...register("activo")} />
        Clínica activa
      </label>
      <Button type="submit" isLoading={isSubmitting}>
        {clinic ? "Guardar cambios" : "Crear clínica"}
      </Button>
    </form>
  );
}
