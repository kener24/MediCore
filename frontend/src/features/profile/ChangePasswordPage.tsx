import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { changePassword } from "../../api/authApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

const schema = z
  .object({
    old_password: z.string().min(1, "La contraseña actual es obligatoria."),
    new_password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirm_password: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "La confirmación no coincide.",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    document.title = "Cambiar contraseña | MediCore";
  }, []);

  async function onSubmit(values: FormValues) {
    try {
      await changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      toast.success("Contraseña actualizada correctamente.");
      reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">Actualiza tus credenciales de acceso.</p>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Contraseña actual" type="password" error={errors.old_password?.message} {...register("old_password")} />
          <Input label="Nueva contraseña" type="password" error={errors.new_password?.message} {...register("new_password")} />
          <Input label="Confirmar nueva contraseña" type="password" error={errors.confirm_password?.message} {...register("confirm_password")} />
          <Button type="submit" isLoading={isSubmitting}>
            Actualizar contraseña
          </Button>
        </form>
      </Card>
    </div>
  );
}
