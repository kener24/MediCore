import type { Patient } from "../../types/patient";
import { Card } from "./Card";
import { PatientStatusBadge } from "./PatientStatusBadge";

export function PatientCard({ patient }: { patient: Patient }) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{patient.codigo_paciente}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{patient.nombre_completo}</h2>
          <p className="mt-1 text-sm text-slate-500">{patient.identidad || "Sin identidad"} · {patient.telefono || "Sin telefono"}</p>
        </div>
        <PatientStatusBadge active={patient.activo} />
      </div>
    </Card>
  );
}
