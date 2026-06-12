import { Badge } from "./Badge";
import type { NotificationPriority, NotificationStatus, NotificationType } from "../../types/notification";

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge tone={status === "unread" ? "role" : status === "read" ? "active" : "inactive"}>{status}</Badge>;
}

export function NotificationPriorityBadge({ priority }: { priority: NotificationPriority }) {
  return <Badge tone={priority === "urgent" || priority === "high" ? "inactive" : "neutral"}>{priority}</Badge>;
}

export function NotificationTypeBadge({ type }: { type: NotificationType }) {
  return <Badge tone={type === "success" ? "active" : type === "error" || type === "warning" ? "inactive" : "neutral"}>{type}</Badge>;
}
