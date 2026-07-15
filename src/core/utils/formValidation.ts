export type InputSanitizer = 'digits' | 'email' | 'identity' | 'money' | 'name' | 'phone' | 'rtn' | 'text';

export function sanitizeInput(value: string, sanitizer?: InputSanitizer) {
  if (!sanitizer || sanitizer === 'text') return value;
  if (sanitizer === 'digits') return value.replace(/\D/g, '');
  if (sanitizer === 'identity' || sanitizer === 'rtn') return value.replace(/\D/g, '').slice(0, 14);
  if (sanitizer === 'phone') return value.replace(/[^0-9+()\-\s]/g, '').slice(0, 20);
  if (sanitizer === 'email') return value.trim().toLowerCase().replace(/\s/g, '');
  if (sanitizer === 'name') return value.replace(/[^\p{L}\p{M}' .-]/gu, '').replace(/\s{2,}/g, ' ');
  if (sanitizer === 'money') return sanitizeMoney(value);
  return value;
}

export function sanitizeMoney(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const [whole, ...decimals] = sanitized.split('.');
  const cleanWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  if (!decimals.length) return cleanWhole;
  return `${cleanWhole}.${decimals.join('').slice(0, 2)}`;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function phoneDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '');
}

export function isValidPhone(value?: string | null, required = false) {
  const digits = phoneDigits(value);
  if (!digits) return !required;
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidIdentity(value?: string | null, required = false) {
  const digits = phoneDigits(value);
  if (!digits) return !required;
  return digits.length >= 8 && digits.length <= 14;
}

export function isValidRtn(value?: string | null, required = false) {
  const digits = phoneDigits(value);
  if (!digits) return !required;
  return digits.length === 14;
}

export function isPositiveMoney(value?: string | number | null) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export function isNonNegativeMoney(value?: string | number | null) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0;
}

export function validatePasswordPair(password: string, confirmPassword: string, currentPassword?: string) {
  if (!currentPassword && currentPassword !== undefined) return 'Escribe tu contraseña actual.';
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (password !== confirmPassword) return 'La confirmación de contraseña no coincide.';
  if (currentPassword && password === currentPassword) return 'La nueva contraseña debe ser diferente a la actual.';
  return '';
}
