export type PatientPrescriptionStatus = 'borrador' | 'emitida' | 'anulada' | string;

export type PatientPrescriptionItem = {
  id?: number;
  medication_name?: string;
  presentation?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  route?: string;
  instructions?: string;
};

export type PatientPrescription = {
  id: number;
  clinic_nombre?: string;
  patient_nombre?: string;
  doctor_nombre?: string;
  doctor_name?: string;
  prescription_number?: string;
  issue_date?: string;
  general_instructions?: string;
  diagnosis?: string;
  diagnosis_name?: string;
  status?: PatientPrescriptionStatus;
  medications?: string[];
  items?: PatientPrescriptionItem[];
  creado_en?: string;
  actualizado_en?: string;
};
