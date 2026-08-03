export interface SuperAdminDashboard {
  total_clinics: number;
  active_clinics: number;
  inactive_clinics: number;
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_admins: number;
  total_medicos: number;
  total_pacientes: number;
  total_enfermeras?: number;
  period?: { key: string; date_from: string; date_to: string };
  usage?: { appointments: number; consultations: number; invoices: number; active_hospitalizations: number };
  subscriptions?: { total: number; active: number; trial: number; suspended: number; expired: number; by_status: Record<string, number> };
  critical_alerts?: number;
  alerts_count?: number;
}

export interface SuperAdminAlert {
  id: string;
  code: string;
  severity: "critical" | "warning" | "info";
  clinic_id: number;
  clinic_name: string;
  message: string;
}

export interface SuperAdminSystemStatus {
  api: string;
  database: string;
  task_queue: string;
  scheduler: string;
  backup: { status: string; last_confirmed_at: string | null };
  version: string;
  environment: string;
  checked_at: string;
}
