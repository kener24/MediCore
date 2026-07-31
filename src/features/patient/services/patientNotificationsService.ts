import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeList, type ListResponse } from '@/features/patient/types/pagination.types';
import type {
  PatientNotification,
  PatientUnreadCount,
} from '@/features/patient/types/patientNotifications.types';

export async function getPatientNotifications(params?: Record<string, string>) {
  const { data } = await apiClient.get<ListResponse<PatientNotification>>(
    endpoints.patientPortal.notifications,
    { params },
  );
  return normalizeList(data);
}

export async function getPatientUnreadNotificationsCount() {
  const { data } = await apiClient.get<PatientUnreadCount>(
    endpoints.patientPortal.unreadNotifications,
  );
  return data.unread_count ?? data.count ?? 0;
}

export async function markPatientNotificationRead(id: number | string) {
  const { data } = await apiClient.patch<PatientNotification>(
    endpoints.patientPortal.markNotificationRead(id),
  );
  return data;
}

export async function markAllPatientNotificationsRead() {
  const { data } = await apiClient.patch<{ updated: number }>(
    endpoints.patientPortal.markAllNotificationsRead,
  );
  return data.updated ?? 0;
}

export const markNotificationAsRead = markPatientNotificationRead;
export const getUnreadNotificationsCount = getPatientUnreadNotificationsCount;
