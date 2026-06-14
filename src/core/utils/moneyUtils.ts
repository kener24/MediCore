export function formatCurrency(value?: string | number | null, currency = 'HNL') {
  const amount = Number(value ?? 0);
  const formatted = new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

  if (currency === 'L' || currency === 'HNL') return `L ${formatted}`;
  return `${currency} ${formatted}`;
}
