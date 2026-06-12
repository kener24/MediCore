import { StatusBadge } from "./StatusBadge";

export function PatientStatusBadge({ active }: { active: boolean }) {
  return <StatusBadge active={active} activeText="Activo" inactiveText="Inactivo" />;
}

