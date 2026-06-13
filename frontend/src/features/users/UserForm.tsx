import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Clinic } from "../../types/clinic";
import type { Role } from "../../types/role";
import type { User, UserPayload } from "../../types/user";
import { onlyPhoneChars, phoneInputProps } from "../../utils/inputSanitizers";

const schema = z
  .object({
    nombre_completo: z.string().min(1, "El nombre completo es obligatorio."),
    email: z.string().email("Ingresa un email válido."),
    telefono: z.string().regex(/^[0-9+()\-\s]*$/, "Solo numeros, espacios, +, guiones y parentesis.").optional(),
    password: z.string().optional(),
    role: z.coerce.number().min(1, "Selecciona un rol."),
    clinica: z.coerce.number().nullable().optional(),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.password && !ctx.path.length) return;
  });

type FormValues = z.infer<typeof schema>;

interface UserFormProps {
  roles: Role[];
  clinics: Clinic[];
  user?: User | null;
  isSubmitting?: boolean;
  onSubmit: (payload: UserPayload) => Promise<void> | void;
}

function getId(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) return Number(value.id);
  return null;
}

export function UserForm({ roles, clinics, user, isSubmitting, onSubmit }: UserFormProps) {
  const isEditing = Boolean(user);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre_completo: user?.nombre_completo ?? "",
      email: user?.email ?? "",
      telefono: user?.telefono ?? "",
      password: "",
      role: getId(user?.role) ?? 0,
      clinica: getId(user?.clinica),
      is_active: user?.is_active ?? true,
    },
  });

  const selectedRole = roles.find((role) => role.id === Number(watch("role")));
  const requiresClinic = selectedRole?.nombre !== "superadmin";

  useEffect(() => {
    if (!isEditing) return;
    document.title = `Editar usuario | MediCore`;
  }, [isEditing]);

  function submit(values: FormValues) {
    if (!isEditing && !values.password) {
      setError("password", { message: "La contraseña es obligatoria al crear usuario." });
      return;
    }
    if (requiresClinic && !values.clinica) {
      setError("clinica", { message: "La clínica es obligatoria excepto para superadmin." });
      return;
    }
    const payload: UserPayload = {
      nombre_completo: values.nombre_completo,
      email: values.email,
      telefono: values.telefono ?? "",
      role: Number(values.role),
      clinica: requiresClinic ? Number(values.clinica) : null,
      is_active: values.is_active,
    };
    if (values.password) payload.password = values.password;
    onSubmit(payload);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre completo" error={errors.nombre_completo?.message} {...register("nombre_completo")} />
        <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Teléfono" maxLength={30} error={errors.telefono?.message} {...phoneInputProps} {...register("telefono", { setValueAs: onlyPhoneChars })} />
        {!isEditing ? <Input label="Contraseña" type="password" error={errors.password?.message} {...register("password")} /> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Rol</span>
          <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("role")}>
            <option value={0}>Seleccionar rol</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nombre}
              </option>
            ))}
          </select>
          {errors.role?.message ? <p className="text-xs font-medium text-rose-600">{errors.role.message}</p> : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Clínica</span>
          <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" disabled={!requiresClinic} {...register("clinica")}>
            <option value="">Sin clínica</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.nombre}
              </option>
            ))}
          </select>
          {errors.clinica?.message ? <p className="text-xs font-medium text-rose-600">{errors.clinica.message}</p> : null}
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input className="h-4 w-4 rounded border-slate-300 text-brand-600" type="checkbox" {...register("is_active")} />
        Usuario activo
      </label>
      <Button type="submit" isLoading={isSubmitting}>
        {isEditing ? "Guardar cambios" : "Crear usuario"}
      </Button>
    </form>
  );
}
