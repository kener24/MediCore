const RECEPTION_PATHS = [
  /^\/clinic\/patients(?:\/|$)/,
  /^\/clinic\/admissions(?:\/|$)/,
  /^\/clinic\/appointments(?:\/|$)/,
  /^\/clinic\/calendar(?:\/|$)/,
  /^\/clinic\/documents(?:\/|$)/,
  /^\/clinic\/reception-dashboard(?:\/|$)/,
  /^\/clinic\/reports\/appointments(?:\/|$)/,
];

const NURSING_PATHS = [
  /^\/clinic\/patients(?:\/|$)/,
  /^\/clinic\/admissions(?:\/|$)/,
  /^\/clinic\/triage(?:\/|$)/,
  /^\/clinic\/hospitalization(?:\/|$)/,
  /^\/clinic\/medical-records(?:\/|$)/,
  /^\/clinic\/consultations(?:\/\d+)?$/,
  /^\/clinic\/diagnoses(?:\/|$)/,
  /^\/clinic\/prescriptions(?:\/|$)/,
  /^\/clinic\/medical-orders(?:\/|$)/,
  /^\/clinic\/documents(?:\/|$)/,
];

const CASHIER_PATHS = [
  /^\/clinic\/billing(?:\/|$)/,
  /^\/clinic\/reports\/financial(?:\/|$)/,
  /^\/clinic\/reports\/cash(?:\/|$)/,
];

export function canAccessClinicPath(role: string, pathname: string) {
  if (!pathname.startsWith("/clinic/")) return true;
  if (role === "admin") return true;
  if (role === "recepcionista") return RECEPTION_PATHS.some((pattern) => pattern.test(pathname));
  if (role === "recepcionista_caja") {
    return [...RECEPTION_PATHS, ...CASHIER_PATHS].some((pattern) => pattern.test(pathname));
  }
  if (role === "cajero") return CASHIER_PATHS.some((pattern) => pattern.test(pathname));
  if (role === "enfermera") return NURSING_PATHS.some((pattern) => pattern.test(pathname));
  return false;
}
