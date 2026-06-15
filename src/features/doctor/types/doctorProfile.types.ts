export type DoctorProfile = {
  id?: number;
  full_name?: string;
  nombre_completo?: string;
  email?: string;
  phone?: string;
  telefono?: string;
  specialty_name?: string;
  especialidad_nombre?: string;
  clinic_name?: string;
  clinica_nombre?: string;
  role_nombre?: string;
  role?: { nombre?: string } | number;
};
