import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { PatientNotification } from '@/features/patient/types/patientNotifications.types';

export async function getDoctorNotifications() {
  const { data } = await apiClient.get<ApiListResponse<PatientNotification>>(endpoints.notifications.list);
  return normalizeListResponse(data);
}

export async function getDoctorUnreadNotificationsCount() {
  const { data } = await apiClient.get<{ count?: number; unread_count?: number }>(
    endpoints.notifications.unreadCount,
  );
  return data.unread_count ?? data.count ?? 0;
}

export async function markDoctorNotificationAsRead(id: number | string) {
  const { data } = await apiClient.patch<PatientNotification>(endpoints.notifications.markRead(id));
  return data;
}
