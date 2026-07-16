export function formatDate(value?: string | null, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(value?: string | null, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatTime(value?: string | null, fallback = 'Sin hora') {
  if (!value) return fallback;
  const normalized = value.length <= 8 ? `1970-01-01T${value}` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return new Intl.DateTimeFormat('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateTime(value?: string | null, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isPastISODate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function parseDateValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}
