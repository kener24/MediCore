export const ACCESS_TOKEN_KEY = "medicore_access_token";
export const REFRESH_TOKEN_KEY = "medicore_refresh_token";
export const SESSION_KEY = "medicore_session_key";

export const ADMIN_ROLES = ["superadmin", "admin"];

export function canManageCatalogs(role?: string) {
  return Boolean(role && ADMIN_ROLES.includes(role));
}
