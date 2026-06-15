export type PrescriptionMedicationPayload = {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

export type CreatePrescriptionPayload = {
  medications: PrescriptionMedicationPayload[];
  general_instructions?: string;
  consultation?: number;
  visit?: number;
};
