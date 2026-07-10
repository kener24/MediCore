import type {
  NurseDashboardSummary,
  NurseNotification,
  NursePatientSummary,
  NurseTriage,
  NurseVitalSigns,
  TriagePriority,
} from '@/features/nurse/types/nurse.types';

function pick<T>(source: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value as T;
  }
  return undefined;
}

function fullName(source?: Record<string, unknown> | null) {
  if (!source) return undefined;
  const direct = pick<string>(source, ['patient_nombre', 'nombre_completo', 'full_name', 'name', 'nombre']);
  if (direct) return direct;
  return [source.first_name, source.last_name, source.nombres, source.apellidos].filter(Boolean).join(' ').trim() || undefined;
}

function asNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapNursePatient(raw: unknown): NursePatientSummary {
  const source = (raw ?? {}) as Record<string, unknown>;
  const patient = (pick<Record<string, unknown>>(source, ['patient', 'paciente', 'patient_data', 'paciente_data']) ?? source) as Record<string, unknown>;
  const visit = (pick<Record<string, unknown>>(source, ['visit', 'visita', 'appointment', 'admission']) ?? source) as Record<string, unknown>;
  return {
    id: pick<number | string>(patient, ['id', 'patient_id', 'paciente_id']) ?? pick<number | string>(source, ['patient_id', 'paciente_id']) ?? '',
    visitId: pick<number | string>(visit, ['id', 'visit_id', 'visita_id']) ?? pick<number | string>(source, ['visit_id', 'visita_id', 'id']),
    name: fullName(patient) ?? fullName(source) ?? 'Paciente sin nombre',
    document: pick<string>(patient, ['patient_identidad', 'documento', 'identidad', 'dni', 'document', 'rtn']) ?? pick<string>(source, ['patient_identidad']),
    age: pick<string>(patient, ['edad', 'age']),
    gender: pick<string>(patient, ['genero', 'sexo', 'gender']),
    phone: pick<string>(patient, ['telefono', 'phone', 'celular']),
    reason: pick<string>(source, ['reason', 'motivo', 'chief_complaint', 'queja_principal', 'motivo_consulta', 'symptoms']),
    arrivalTime: pick<string>(source, ['arrival_time', 'hora_llegada', 'created_at', 'fecha_ingreso']),
    status: pick<string>(source, ['status', 'estado']) ?? 'waiting',
    priority: pick<string>(source, ['priority', 'prioridad']),
    doctorName: pick<string>(source, ['assigned_doctor_nombre', 'doctor_name', 'medico_nombre']),
  };
}

export function mapVitalSigns(raw: unknown): NurseVitalSigns {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id: pick(source, ['id']),
    visitId: pick(source, ['visit', 'visit_id', 'visita', 'visita_id']),
    patientId: pick(source, ['patient', 'patient_id', 'paciente', 'paciente_id']),
    temperature: asNumber(pick(source, ['temperature', 'temperatura'])),
    heartRate: asNumber(pick(source, ['heart_rate', 'frecuencia_cardiaca', 'pulso'])),
    respiratoryRate: asNumber(pick(source, ['respiratory_rate', 'frecuencia_respiratoria'])),
    systolicPressure: asNumber(pick(source, ['blood_pressure_systolic', 'systolic_pressure', 'presion_sistolica', 'systolic'])),
    diastolicPressure: asNumber(pick(source, ['blood_pressure_diastolic', 'diastolic_pressure', 'presion_diastolica', 'diastolic'])),
    oxygenSaturation: asNumber(pick(source, ['oxygen_saturation', 'saturacion_oxigeno', 'spo2'])),
    weightKg: asNumber(pick(source, ['weight_kg', 'peso', 'peso_kg', 'weight'])),
    heightCm: (() => {
      const height = asNumber(pick(source, ['height_cm', 'talla', 'talla_cm', 'height']));
      return height && height <= 3 ? Math.round(height * 100) : height;
    })(),
    bmi: asNumber(pick(source, ['bmi', 'imc'])),
    painScale: asNumber(pick(source, ['pain_scale', 'escala_dolor', 'dolor'])),
    glucose: asNumber(pick(source, ['glucose', 'glucosa'])),
    notes: pick<string>(source, ['notes', 'notas', 'observaciones']),
    recordedAt: pick<string>(source, ['recorded_at', 'created_at', 'fecha']),
  };
}

export function mapTriage(raw: unknown): NurseTriage {
  const source = (raw ?? {}) as Record<string, unknown>;
  const vital = pick<Record<string, unknown>>(source, ['vital_signs', 'signos_vitales', 'vitals']);
  return {
    id: pick<number | string>(source, ['id']) ?? '',
    visitId: pick(source, ['visit', 'visit_id', 'visita', 'visita_id', 'id']),
    patient: mapNursePatient(source),
    priority: pick<TriagePriority | string>(source, ['priority', 'prioridad']) ?? 'normal',
    status: pick<string>(source, ['status', 'estado']) ?? 'completed',
    chiefComplaint: pick<string>(source, ['chief_complaint', 'queja_principal', 'motivo_consulta', 'reason']),
    initialAssessment: pick<string>(source, ['initial_assessment', 'evaluacion_inicial', 'assessment', 'symptoms']),
    notes: pick<string>(source, ['notes', 'notas', 'observaciones']),
    vitalSigns: vital ? mapVitalSigns(vital) : null,
    nurseName: pick<string>(source, ['assigned_nurse_nombre', 'nurse_name', 'enfermera_nombre']),
    doctorName: pick<string>(source, ['assigned_doctor_nombre', 'doctor_name', 'medico_nombre']),
    completedAt: pick<string>(source, ['triage_completed_at', 'completed_at', 'fecha_completado']),
    createdAt: pick<string>(source, ['created_at', 'fecha']),
  };
}

export function mapDashboard(raw: unknown): NurseDashboardSummary {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    waitingCount: asNumber(pick(source, ['waiting_count', 'en_espera', 'waiting'])) ?? 0,
    inTriageCount: asNumber(pick(source, ['in_triage_count', 'en_triaje', 'triage'])) ?? 0,
    completedTodayCount: asNumber(pick(source, ['completed_today_count', 'triajes_hoy', 'completed'])) ?? 0,
    priorityCount: asNumber(pick(source, ['priority_count', 'prioritarios', 'urgent'])) ?? 0,
    unreadNotifications: asNumber(pick(source, ['unread_notifications', 'notificaciones_no_leidas'])) ?? 0,
  };
}

export function mapNotification(raw: unknown): NurseNotification {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id: pick<number | string>(source, ['id']) ?? '',
    title: pick<string>(source, ['title', 'titulo', 'subject']) ?? 'Notificación',
    message: pick<string>(source, ['message', 'mensaje', 'body', 'descripcion']),
    read: Boolean(pick(source, ['read', 'is_read', 'leida']) ?? false),
    createdAt: pick<string>(source, ['created_at', 'fecha']),
  };
}
