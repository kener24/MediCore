export type PatientNotification = {
  id: number;
  title?: string;
  titulo?: string;
  message?: string;
  mensaje?: string;
  body?: string;
  module?: string;
  modulo?: string;
  action_url?: string;
  is_read?: boolean;
  read?: boolean;
  created_at?: string;
  creado_en?: string;
};

export type PatientUnreadCount = {
  unread_count?: number;
  count?: number;
};
