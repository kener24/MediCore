export type PrescriptionMedicationPayload = {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number | string;
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
  consultation_id?: number;
  patient_id?: number;
  doctor_name?: string;
  status?: string;
  general_instructions?: string | null;
  notes?: string | null;
  created_at?: string;
  medications?: PrescriptionMedicationPayload[];
};
