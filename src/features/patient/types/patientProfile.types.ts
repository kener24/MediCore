export type PatientProfile = {
  id?: number;
  patient_id?: number;
  codigo_paciente?: string;
  patient_code?: string;
  nombre_completo?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  identidad?: string;
  identity_number?: string;
  telefono?: string;
  phone?: string;
  correo?: string;
  email?: string;
  direccion?: string;
  address?: string;
  ciudad?: string;
  city?: string;
  departamento?: string;
  department?: string;
  birth_date?: string;
  fecha_nacimiento?: string;
  gender?: string;
  genero?: string;
  contacto_emergencia_nombre?: string;
  emergency_contact_name?: string;
  contacto_emergencia_telefono?: string;
  emergency_contact_phone?: string;
  contacto_emergencia_parentesco?: string;
  emergency_contact_relationship?: string;
  clinic?: {
    id?: number;
    name?: string;
    nombre?: string;
  };
  clinica?: {
    id?: number;
    name?: string;
    nombre?: string;
  };
  clinica_nombre?: string;
  clinic_nombre?: string;
  clinic_name?: string;
  alergias?: string;
  enfermedades_cronicas?: string;
};

export type PatientProfileUpdatePayload = {
  telefono?: string;
  phone?: string;
  correo?: string;
  email?: string;
  direccion?: string;
  address?: string;
  ciudad?: string;
  city?: string;
  departamento?: string;
  department?: string;
  contacto_emergencia_nombre?: string;
  emergency_contact_name?: string;
  contacto_emergencia_telefono?: string;
  emergency_contact_phone?: string;
  contacto_emergencia_parentesco?: string;
  emergency_contact_relationship?: string;
};

export type UpdatePatientProfilePayload = PatientProfileUpdatePayload;
