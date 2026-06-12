import { Badge } from "./Badge";

export function GenderBadge({ gender }: { gender?: string }) {
  return <Badge tone="neutral">{gender || "no_especificado"}</Badge>;
}

