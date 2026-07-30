import type { PatientClinicInfo, PatientPortalPermissions } from '@/features/patient/types/patientDashboard.types';

export type PatientPortalSettings = {
  clinic?: PatientClinicInfo;
  permissions?: PatientPortalPermissions;
  portal?: {
    allow_patient_portal?: boolean;
    allow_appointments?: boolean;
    allow_online_appointments?: boolean;
    allow_in_person_appointments?: boolean;
    allow_patient_cancellations?: boolean;
    cancellation_hours_limit?: number;
    allow_patient_medical_record_view?: boolean;
    allow_patient_prescription_view?: boolean;
    allow_patient_invoice_view?: boolean;
    currency?: string;
    language?: string;
    terms_and_conditions?: string;
    privacy_policy?: string;
  };
};
