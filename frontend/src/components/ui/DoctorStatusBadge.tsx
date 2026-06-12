import { StatusBadge } from "./StatusBadge";

export function DoctorStatusBadge({ active }: { active: boolean }) {
  return <StatusBadge active={active} activeText="Activo" inactiveText="Inactivo" />;
}

