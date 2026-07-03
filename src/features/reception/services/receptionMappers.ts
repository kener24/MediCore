import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';
import type { MinimalPatientPayload, ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

const value = (...values: unknown[]) => values.find((item) => item !== undefined && item !== null && item !== '') as string | undefined;

export function patientName(patient?: ReceptionPatient | null) {
  if (!patient) return 'Paciente sin nombre';
  return value(patient.full_name, patient.nombre_completo, [patient.first_name ?? patient.nombres, patient.last_name ?? patient.apellidos].filter(Boolean).join(' ')) ?? 'Paciente sin nombre';
}

export function patientIdentity(patient?: ReceptionPatient | null) {
  if (!patient) return 'Sin identidad';
  return value(patient.identity_number, patient.identidad) ?? 'Sin identidad';
}

export function patientPhone(patient?: ReceptionPatient | null) {
  if (!patient) return 'Sin telefono';
  return value(patient.phone, patient.telefono) ?? 'Sin telefono';
}

export function mapMinimalPatientPayload(payload: MinimalPatientPayload) {
  const parts = String(payload.full_name ?? '').trim().split(/\s+/);
  const firstName = payload.first_name?.trim() || parts.slice(0, -1).join(' ') || parts[0] || '';
  const lastName = payload.last_name?.trim() || (parts.length > 1 ? parts.slice(-1).join(' ') : '');
  return {
    nombres: firstName,
    apellidos: lastName,
    identidad: payload.identity_number?.trim() || '',
    telefono: payload.phone?.trim() || '',
    genero: payload.gender || '',
    fecha_nacimiento: payload.birth_date || null,
  };
}

export function visitPatientName(visit?: ReceptionVisit | null) {
  return value(visit?.patient_name, visit?.patient_nombre) ?? 'Paciente sin nombre';
}

export function visitDoctorName(visit?: ReceptionVisit | null) {
  return value(visit?.doctor_name, visit?.assigned_doctor_nombre) ?? 'Sin medico asignado';
}

export function appointmentPatientName(appointment?: ReceptionAppointment | null) {
  return value(appointment?.patient_name, appointment?.patient_nombre) ?? 'Paciente sin nombre';
}

export function appointmentDoctorName(appointment?: ReceptionAppointment | null) {
  return value(appointment?.doctor_name, appointment?.doctor_nombre) ?? 'Sin medico asignado';
}
