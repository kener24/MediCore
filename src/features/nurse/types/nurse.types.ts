export type TriagePriority = 'critical' | 'urgent' | 'preferential' | 'normal' | 'low';
export type TriageStatus = 'waiting' | 'in_triage' | 'completed' | 'sent_to_doctor' | 'cancelled';

export interface ApiListResponse<T> {
  results?: T[];
  data?: T[];
  items?: T[];
  count?: number;
}

export function normalizeListResponse<T>(response: ApiListResponse<T> | T[] | unknown): T[] {
  if (Array.isArray(response)) return response;
  const payload = response as ApiListResponse<T>;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export interface NursePatientSummary {
  id: number | string;
  visitId?: number | string;
  name: string;
  document?: string;
  age?: string;
  gender?: string;
  phone?: string;
  reason?: string;
  arrivalTime?: string;
  status?: TriageStatus | string;
  priority?: TriagePriority | string;
  doctorName?: string;
}

export interface NurseVitalSigns {
  id?: number | string;
  visitId?: number | string;
  patientId?: number | string;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  systolicPressure?: number;
  diastolicPressure?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  painScale?: number;
  glucose?: number;
  notes?: string;
  recordedAt?: string;
}

export interface NurseTriage {
  id: number | string;
  visitId?: number | string;
  patient: NursePatientSummary;
  priority: TriagePriority | string;
  status: TriageStatus | string;
  chiefComplaint?: string;
  initialAssessment?: string;
  notes?: string;
  vitalSigns?: NurseVitalSigns | null;
  nurseName?: string;
  doctorName?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface NurseDashboardSummary {
  waitingCount: number;
  inTriageCount: number;
  completedTodayCount: number;
  priorityCount: number;
  unreadNotifications: number;
}

export interface NurseNotification {
  id: number | string;
  title: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
}

export interface VitalSignsPayload {
  visit: number | string;
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  systolic_pressure?: number;
  diastolic_pressure?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  pain_scale?: number;
  glucose?: number;
  notes?: string;
}

export interface CompleteTriagePayload {
  visit: number | string;
  chief_complaint: string;
  initial_assessment: string;
  priority: TriagePriority;
  notes?: string;
}
