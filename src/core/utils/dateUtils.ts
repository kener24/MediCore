export function formatDate(value?: string | null, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(value?: string | null, fallback = 'Sin hora') {
  if (!value) return fallback;
  return value.slice(0, 5);
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
