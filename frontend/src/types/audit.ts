export type AuditSeverity = "info" | "warning" | "error" | "critical";
export type AuditStatus = "success" | "failed" | "warning";
export type AuditAction = string;
export type AuditModule = string;

export interface AuditLog { id: number; clinic: number | null; clinic_nombre?: string; user: number | null; user_nombre?: string; user_email?: string; user_role?: string; action: AuditAction; module: AuditModule; object_type?: string; model_name: string; object_id: string; object_repr: string; description: string; status?: AuditStatus; severity: AuditSeverity; ip_address: string | null; user_agent?: string; request_method: string; request_path: string; before_data?: Record<string, unknown>; after_data?: Record<string, unknown>; changes?: Record<string, unknown>; old_values?: Record<string, unknown>; new_values?: Record<string, unknown>; metadata?: Record<string, unknown>; created_at: string; }
export interface AuditStats { total_logs: number; logs_today: number; warnings: number; errors: number; critical: number; failed?: number; login_success: number; login_failed: number; top_actions: Array<{ action: AuditAction; count: number }>; top_modules: Array<{ module: AuditModule; count: number }>; }
export interface AuditFilters { user?: string; clinic?: string; action?: string; module?: string; severity?: string; status?: string; object_type?: string; model_name?: string; object_id?: string; date_from?: string; date_to?: string; search?: string; page?: string; page_size?: string; }
export interface PaginatedAuditLogs { count: number; next: string | null; previous: string | null; results: AuditLog[]; }
