export type PatientProfile = {
  id: number;
  codigo_paciente?: string;
  nombre_completo?: string;
  identidad?: string;
  telefono?: string;
  correo?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_parentesco?: string;
  clinica_nombre?: string;
  clinic_nombre?: string;
  alergias?: string;
  enfermedades_cronicas?: string;
};

export type PatientProfileUpdatePayload = Pick<
  PatientProfile,
  | 'telefono'
  | 'correo'
  | 'email'
  | 'direccion'
  | 'ciudad'
  | 'departamento'
  | 'contacto_emergencia_nombre'
  | 'contacto_emergencia_telefono'
  | 'contacto_emergencia_parentesco'
>;
