export function formatDate(value?: string | null) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
