import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { TimeInput } from "../../components/ui/TimeInput";
import type { DoctorSchedule, DoctorSchedulePayload } from "../../types/doctor";

const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export function ScheduleForm({ schedule, isSubmitting, onSubmit }: { schedule?: DoctorSchedule | null; isSubmitting?: boolean; onSubmit: (payload: DoctorSchedulePayload) => void }) {
  const { register, handleSubmit } = useForm<DoctorSchedulePayload>({
    defaultValues: {
      dia_semana: schedule?.dia_semana ?? "lunes",
      hora_inicio: schedule?.hora_inicio?.slice(0, 5) ?? "08:00",
      hora_fin: schedule?.hora_fin?.slice(0, 5) ?? "12:00",
      activo: schedule?.activo ?? true,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Dia</span>
          <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...register("dia_semana")}>
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <TimeInput label="Hora inicio" {...register("hora_inicio", { required: true })} />
        <TimeInput label="Hora fin" {...register("hora_fin", { required: true })} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" className="h-4 w-4" {...register("activo")} />
        Horario activo
      </label>
      <Button type="submit" isLoading={isSubmitting}>{schedule ? "Guardar horario" : "Crear horario"}</Button>
    </form>
  );
}
