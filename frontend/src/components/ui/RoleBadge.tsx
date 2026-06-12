import { Badge } from "./Badge";

export function RoleBadge({ role }: { role?: string }) {
  return <Badge tone="role">{role || "Sin rol"}</Badge>;
}
