import { Badge } from "./Badge";

export function BloodTypeBadge({ bloodType }: { bloodType?: string }) {
  return <Badge tone="role">{bloodType || "desconocido"}</Badge>;
}

