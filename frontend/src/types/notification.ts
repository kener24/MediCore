export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationType = "info" | "reminder" | "alert" | "warning" | "success" | "error";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface Notification { id: number; clinic: number | null; clinic_nombre?: string; title: string; message: string; notification_type: NotificationType; module: string; priority: NotificationPriority; status: NotificationStatus; related_model: string; related_object_id: string; action_url: string; read_at: string | null; sent_at: string | null; expires_at: string | null; metadata?: Record<string, unknown>; creado_en: string; actualizado_en: string; }
export interface PaginatedNotifications { count: number; next: string | null; previous: string | null; results: Notification[]; }
export interface NotificationFilters { status?: string; notification_type?: string; module?: string; priority?: string; date_from?: string; date_to?: string; search?: string; page?: string; page_size?: string; }
export interface NotificationPreference { id: number; user: number; receive_appointment_reminders: boolean; receive_billing_alerts: boolean; receive_inventory_alerts: boolean; receive_purchase_alerts: boolean; receive_audit_alerts: boolean; receive_system_notifications: boolean; email_enabled: boolean; sms_enabled: boolean; whatsapp_enabled: boolean; push_enabled: boolean; }
export interface NotificationStats { total: number; unread: number; read: number; archived: number; urgent: number; by_module: Array<{ module: string; count: number }>; by_type: Array<{ notification_type: string; count: number }>; }
export interface NotificationSummary { unread_count: number; urgent_count: number; high_priority_count: number; latest: Notification[]; }

