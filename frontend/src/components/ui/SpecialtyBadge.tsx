import { Badge } from "./Badge";

export function SpecialtyBadge({ specialty }: { specialty?: string }) {
  return <Badge tone="role">{specialty || "Sin especialidad"}</Badge>;
}

