import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ClinicAdminUser, ClinicUserCreatePayload, ClinicUserUpdatePayload } from "../../types/clinicAdmin";

const allowedRoles = ["admin", "medico", "enfermera", "recepcionista", "paciente"];

const schema = z.object({
  nombre_completo: z.string().min(1, "El nombre completo es obligatorio."),
  email: z.string().email("Ingresa un email valido."),
  telefono: z.string().optional(),
  role: z.string().refine((value) => allowedRoles.includes(value), "Selecciona un rol valido."),
  password: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ClinicUserFormProps {
  user?: ClinicAdminUser | null;
  isSubmitting?: boolean;
  onSubmit: (payload: ClinicUserCreatePayload | ClinicUserUpdatePayload) => Promise<void> | void;
}

export function ClinicUserForm({ user, isSubmitting, onSubmit }: ClinicUserFormProps) {
  const isEditing = Boolean(user);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre_completo: user?.nombre_completo ?? "",
      email: user?.email ?? "",
      telefono: user?.telefono ?? "",
      role: user?.role_nombre && allowedRoles.includes(user.role_nombre) ? user.role_nombre : "medico",
      password: "",
      is_active: user?.is_active ?? true,
    },
  });

  useEffect(() => {
    reset({
      nombre_completo: user?.nombre_completo ?? "",
      email: user?.email ?? "",
      telefono: user?.telefono ?? "",
      role: user?.role_nombre && allowedRoles.includes(user.role_nombre) ? user.role_nombre : "medico",
      password: "",
      is_active: user?.is_active ?? true,
    });
  }, [reset, user]);

  function submit(values: FormValues) {
    if (!isEditing && (!values.password || values.password.length < 8)) {
      setError("password", { message: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    const payload = {
      nombre_completo: values.nombre_completo,
      email: values.email,
      telefono: values.telefono ?? "",
      role: values.role,
      is_active: values.is_active,
    };
    onSubmit(isEditing ? payload : { ...payload, password: values.password ?? "" });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre completo" error={errors.nombre_completo?.message} {...register("nombre_completo")} />
        <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Telefono" error={errors.telefono?.message} {...register("telefono")} />
        {!isEditing ? <Input label="Contrasena" type="password" error={errors.password?.message} {...register("password")} /> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Rol</span>
          <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("role")}>
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.role?.message ? <p className="text-xs font-medium text-rose-600">{errors.role.message}</p> : null}
        </label>
        <label className="flex items-center gap-2 pt-8 text-sm font-medium text-slate-700">
          <input className="h-4 w-4 rounded border-slate-300 text-brand-600" type="checkbox" {...register("is_active")} />
          Usuario activo
        </label>
      </div>
      <Button type="submit" isLoading={isSubmitting}>
        {isEditing ? "Guardar cambios" : "Crear usuario"}
      </Button>
    </form>
  );
}
