import api from "./axios";
import type { Notification, NotificationFilters, NotificationPreference, NotificationStats, NotificationSummary, PaginatedNotifications } from "../types/notification";

export async function getNotifications(filters?: NotificationFilters) { const { data } = await api.get<PaginatedNotifications>("/notifications/", { params: filters }); return data; }
export async function getNotification(id: number | string) { const { data } = await api.get<Notification>(`/notifications/${id}/`); return data; }
export async function markNotificationRead(id: number | string) { const { data } = await api.patch<Notification>(`/notifications/${id}/mark-read/`); return data; }
export async function markNotificationUnread(id: number | string) { const { data } = await api.patch<Notification>(`/notifications/${id}/mark-unread/`); return data; }
export async function markAllNotificationsRead() { const { data } = await api.post<{ updated: number }>("/notifications/mark-all-read/"); return data; }
export async function archiveNotification(id: number | string) { const { data } = await api.patch<Notification>(`/notifications/${id}/archive/`); return data; }
export async function getUnreadNotificationCount() { const { data } = await api.get<{ unread_count: number }>("/notifications/unread-count/"); return data; }
export async function getNotificationSummary() { const { data } = await api.get<NotificationSummary>("/notifications/summary/"); return data; }
export async function getNotificationPreferences() { const { data } = await api.get<NotificationPreference>("/notifications/preferences/"); return data; }
export async function updateNotificationPreferences(payload: Partial<NotificationPreference>) { const { data } = await api.patch<NotificationPreference>("/notifications/preferences/", payload); return data; }
export async function getNotificationStats() { const { data } = await api.get<NotificationStats>("/notifications/stats/"); return data; }
export async function generateInventoryAlerts() { const { data } = await api.post<{ created: number }>("/notifications/generate-inventory-alerts/"); return data; }
export async function generateAppointmentReminders(hours = 24) { const { data } = await api.post<{ created: number }>("/notifications/generate-appointment-reminders/", { hours }); return data; }
export async function generateBillingAlerts() { const { data } = await api.post<{ created: number }>("/notifications/generate-billing-alerts/"); return data; }

