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
  module?: string;
  modulo?: string;
  action_url?: string | null;
  related_object_id?: number | null;
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
