import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Patient, PatientPayload } from "../../types/patient";
import { digitInputProps, onlyDigits, onlyPhoneChars, phoneInputProps } from "../../utils/inputSanitizers";

interface PatientFormProps {
  patient?: Patient | null;
  isSubmitting?: boolean;
  onSubmit: (payload: PatientPayload) => void | Promise<void>;
}

export function PatientForm({ patient, isSubmitting, onSubmit }: PatientFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientPayload>({
    defaultValues: {
      nombres: patient?.nombres ?? "",
      apellidos: patient?.apellidos ?? "",
      identidad: patient?.identidad ?? "",
      fecha_nacimiento: patient?.fecha_nacimiento ?? "",
      genero: patient?.genero ?? "no_especificado",
      tipo_sangre: patient?.tipo_sangre ?? "desconocido",
      telefono: patient?.telefono ?? "",
      correo: patient?.correo ?? "",
      direccion: patient?.direccion ?? "",
      ciudad: patient?.ciudad ?? "",
      departamento: patient?.departamento ?? "",
      pais: patient?.pais ?? "Honduras",
      contacto_emergencia_nombre: patient?.contacto_emergencia_nombre ?? "",
      contacto_emergencia_telefono: patient?.contacto_emergencia_telefono ?? "",
      contacto_emergencia_parentesco: patient?.contacto_emergencia_parentesco ?? "",
      alergias: patient?.alergias ?? "",
      enfermedades_cronicas: patient?.enfermedades_cronicas ?? "",
      observaciones: patient?.observaciones ?? "",
      activo: patient?.activo ?? true,
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card title="Datos basicos">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombres" required {...register("nombres", { required: true })} />
          <Input label="Apellidos" required {...register("apellidos", { required: true })} />
          <Input label="Identidad" maxLength={20} error={errors.identidad?.message} {...digitInputProps} {...register("identidad", { setValueAs: onlyDigits, minLength: { value: 8, message: "Minimo 8 digitos." }, maxLength: { value: 20, message: "Maximo 20 digitos." } })} />
          <Input label="Fecha nacimiento" type="date" {...register("fecha_nacimiento")} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Genero</span>
            <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("genero")}>
              <option value="masculino">masculino</option>
              <option value="femenino">femenino</option>
              <option value="otro">otro</option>
              <option value="no_especificado">no_especificado</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Tipo de sangre</span>
            <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("tipo_sangre")}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "desconocido"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </Card>
      <Card title="Contacto">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Telefono" maxLength={30} error={errors.telefono?.message} {...phoneInputProps} {...register("telefono", { setValueAs: onlyPhoneChars })} />
          <Input label="Correo" type="email" {...register("correo")} />
          <Input label="Ciudad" {...register("ciudad")} />
          <Input label="Departamento" {...register("departamento")} />
          <Input label="Pais" {...register("pais")} />
        </div>
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Direccion</span>
          <textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...register("direccion")} />
        </label>
      </Card>
      <Card title="Emergencia">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Contacto" {...register("contacto_emergencia_nombre")} />
          <Input label="Telefono emergencia" maxLength={30} error={errors.contacto_emergencia_telefono?.message} {...phoneInputProps} {...register("contacto_emergencia_telefono", { setValueAs: onlyPhoneChars })} />
          <Input label="Parentesco" {...register("contacto_emergencia_parentesco")} />
        </div>
      </Card>
      <Card title="Salud basica">
        <div className="grid gap-4 md:grid-cols-3">
          <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Alergias" {...register("alergias")} />
          <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Enfermedades cronicas" {...register("enfermedades_cronicas")} />
          <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Observaciones" {...register("observaciones")} />
        </div>
      </Card>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" className="h-4 w-4" {...register("activo")} />
        Paciente activo
      </label>
      <Button type="submit" isLoading={isSubmitting}>{patient ? "Guardar cambios" : "Crear paciente"}</Button>
    </form>
  );
}
