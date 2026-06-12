import { Badge } from "./Badge";

export function StatusBadge({ active, activeText = "Activo", inactiveText = "Inactivo" }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return <Badge tone={active ? "active" : "inactive"}>{active ? activeText : inactiveText}</Badge>;
}
