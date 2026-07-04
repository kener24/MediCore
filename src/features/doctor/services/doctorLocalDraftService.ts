import * as SecureStore from 'expo-secure-store';

import type { ConsultationFormValues } from '@/features/doctor/types/doctorConsultation.types';

const DRAFT_PREFIX = 'medicore.doctor.consultationDraft.';

export async function saveDoctorConsultationDraft(key: string | number, values: ConsultationFormValues) {
  await SecureStore.setItemAsync(`${DRAFT_PREFIX}${key}`, JSON.stringify({ savedAt: new Date().toISOString(), values }));
}

export async function getDoctorConsultationDraft(key: string | number) {
  const payload = await SecureStore.getItemAsync(`${DRAFT_PREFIX}${key}`);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as { savedAt: string; values: ConsultationFormValues };
  } catch {
    await clearDoctorConsultationDraft(key);
    return null;
  }
}

export async function clearDoctorConsultationDraft(key: string | number) {
  await SecureStore.deleteItemAsync(`${DRAFT_PREFIX}${key}`);
}
