export type PatientNotification = {
  id: number;
  title?: string;
  titulo?: string;
  message?: string;
  mensaje?: string;
  body?: string;
  type?: string;
  tipo?: string;
  notification_type?: string;
  notification_type_display?: string;
  module?: string;
  modulo?: string;
  target?: {
    type: string;
    id: string;
    path: string;
  } | null;
  priority?: string;
  priority_display?: string;
  is_read?: boolean;
  read?: boolean;
  status?: string;
  read_at?: string | null;
  created_at?: string;
  creado_en?: string;
};

export type UnreadNotificationsCountResponse = {
  unread_count?: number;
  count?: number;
};

export type PatientUnreadCount = UnreadNotificationsCountResponse;
