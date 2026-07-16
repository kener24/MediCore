import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { apiClient } from '@/core/api/apiClient';
import { endpoints } from '@/core/api/endpoints';
import { appConfig } from '@/core/config/appConfig';

type NotificationsModule = typeof import('expo-notifications');

export type NotificationPreferences = {
  push_enabled?: boolean;
  receive_appointment_reminders?: boolean;
  receive_billing_alerts?: boolean;
  receive_system_notifications?: boolean;
};

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo()) return null;

  const notifications = await import('expo-notifications');
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return notifications;
}

export async function getNotificationPreferences() {
  const { data } = await apiClient.get<NotificationPreferences>(endpoints.notifications.preferences);
  return data;
}

export async function updateNotificationPreferences(payload: Partial<NotificationPreferences>) {
  const { data } = await apiClient.patch<NotificationPreferences>(endpoints.notifications.preferences, payload);
  return data;
}

export async function disablePushDevice(expoPushToken?: string) {
  await apiClient.delete(endpoints.notifications.pushDevices, { data: expoPushToken ? { expo_push_token: expoPushToken } : {} });
}

export async function registerDeviceForPushNotifications() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return {
      registered: false,
      reason: 'Expo Go no soporta push notifications en Android desde SDK 53. Usa un development build o APK para probarlas.',
    };
  }

  if (!Device.isDevice) {
    return { registered: false, reason: 'Las notificaciones push requieren un dispositivo físico.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#2563EB',
      name: 'MediCore',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    await updateNotificationPreferences({ push_enabled: false }).catch(() => undefined);
    return { registered: false, reason: 'Permiso de notificaciones no concedido.' };
  }

  const resolvedProjectId = projectId();
  if (!resolvedProjectId) {
    return { registered: false, reason: 'Proyecto EAS no configurado para push notifications.' };
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId: resolvedProjectId });
  const { data } = await apiClient.post(endpoints.notifications.pushDevices, {
    app_version: appConfig.APP_VERSION,
    device_name: Device.deviceName ?? `${Platform.OS} device`,
    expo_push_token: token.data,
    platform: Platform.OS,
  });
  return { registered: true, token: token.data, device: data };
}
