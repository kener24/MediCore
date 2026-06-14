export type PrescriptionStatus =
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'borrador'
  | 'emitida'
  | 'anulada'
  | string;

export type PatientPrescriptionStatus = PrescriptionStatus;

export type PatientPrescriptionItem = {
  id?: number;
  medication_name?: string;
  name?: string;
  presentation?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string | number | null;
  route?: string;
  instructions?: string | null;
};

export type PrescriptionMedication = PatientPrescriptionItem;

export type PatientPrescription = {
  id: number;
  clinic_name?: string;
  clinic_nombre?: string;
  created_at?: string;
  date?: string;
  patient_name?: string;
  patient_nombre?: string;
  doctor_nombre?: string;
  doctor_name?: string;
  prescription_number?: string;
  issue_date?: string;
  general_instructions?: string | null;
  diagnosis?: string | null;
  diagnosis_name?: string | null;
  notes?: string | null;
  summary?: string;
  status?: PatientPrescriptionStatus;
  medications?: string[] | PatientPrescriptionItem[];
  items?: PatientPrescriptionItem[];
  creado_en?: string;
  actualizado_en?: string;
};

export type PatientPrescriptionDetail = PatientPrescription;
