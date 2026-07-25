export type PrescriptionMedicationPayload = {
  medication_name: string;
  presentation?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number | string;
  route?: string;
  allergy_warnings?: string[];
};

export type CreatePrescriptionPayload = {
  consultation?: number;
  visit?: number;
  medications: PrescriptionMedicationPayload[];
  general_instructions?: string;
  notes?: string;
};

export type DoctorPrescription = {
  id?: number;
  prescription_number?: string;
  consultation_id?: number;
  consultation?: number;
  patient_id?: number;
  doctor_name?: string;
  status?: string;
  prescription_type?: 'unica' | 'repetible';
  issue_date?: string;
  issued_at?: string | null;
  general_instructions?: string | null;
  notes?: string | null;
  created_at?: string;
  medications?: PrescriptionMedicationPayload[] | string[];
  items?: PrescriptionMedicationPayload[];
};
