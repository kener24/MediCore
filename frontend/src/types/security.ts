export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_symbol: boolean;
}

export interface PasswordPolicyValidation {
  valid: boolean;
  errors: string[];
  policy: PasswordPolicy;
}

export interface EmailVerificationStatus {
  email: string;
  email_verified: boolean;
}

export interface UserSession {
  id: number;
  user: number;
  user_email: string;
  user_nombre: string;
  session_key: string;
  ip_address: string | null;
  user_agent: string;
  device_name: string;
  last_activity_at: string;
  expires_at: string;
  revoked_at: string | null;
  active: boolean;
  created_at: string;
  current: boolean;
}

export interface AccountLock {
  id: number;
  user: number;
  user_email: string;
  user_nombre: string;
  clinic: number | null;
  clinic_nombre: string;
  locked_until: string;
  reason: string;
  failed_attempts: number;
  active: boolean;
  created_at: string;
  unlocked_at: string | null;
  unlocked_by: number | null;
}

export interface SecuritySettings {
  id: number;
  clinic: number | null;
  clinic_nombre: string;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_symbol: boolean;
  max_failed_login_attempts: number;
  lockout_minutes: number;
  password_reset_token_minutes: number;
  email_verification_token_minutes: number;
  session_lifetime_minutes: number;
  require_email_verification: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecurityActivity {
  id: number;
  action: string;
  module: string;
  description: string;
  severity: string;
  ip_address: string | null;
  created_at: string;
}
