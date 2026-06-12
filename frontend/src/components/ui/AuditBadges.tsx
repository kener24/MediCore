import { Badge } from "./Badge";
import type { AuditAction, AuditModule, AuditSeverity } from "../../types/audit";

export function AuditSeverityBadge({ severity }: { severity: AuditSeverity }) {
  const tone = severity === "info" ? "neutral" : severity === "warning" ? "role" : "inactive";
  return <Badge tone={tone}>{severity}</Badge>;
}

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return <Badge tone={action.includes("failed") || action === "cancel" || action === "void" ? "inactive" : "neutral"}>{action}</Badge>;
}

export function AuditModuleBadge({ module }: { module: AuditModule }) {
  return <Badge tone="role">{module}</Badge>;
}
