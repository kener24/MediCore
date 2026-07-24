import * as SecureStore from 'expo-secure-store';

import type { ConsultationFormValues } from '@/features/doctor/types/doctorConsultation.types';

const DRAFT_PREFIX = 'medicore.doctor.consultationDraft.';
const DRAFT_REGISTRY = 'medicore.doctor.consultationDraft.keys';

export type DoctorConsultationDraftScope = {
  clinicId: number;
  consultationId: number;
  patientId: number;
  userId: number;
  visitId: number;
};

export type DoctorConsultationDraft = {
  savedAt: string;
  serverVersion: number;
  values: ConsultationFormValues;
};

export async function saveDoctorConsultationDraft(
  scope: DoctorConsultationDraftScope,
  values: ConsultationFormValues,
  serverVersion: number,
) {
  const key = draftKey(scope);
  await SecureStore.setItemAsync(key, JSON.stringify({ savedAt: new Date().toISOString(), serverVersion, values }));
  const registry = await getRegistry();
  if (!registry.includes(key)) await setRegistry([...registry, key]);
}

export async function getDoctorConsultationDraft(scope: DoctorConsultationDraftScope) {
  const key = draftKey(scope);
  const payload = await SecureStore.getItemAsync(key);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as DoctorConsultationDraft;
  } catch {
    await clearDoctorConsultationDraft(scope);
    return null;
  }
}

export async function clearDoctorConsultationDraft(scope: DoctorConsultationDraftScope) {
  const key = draftKey(scope);
  await SecureStore.deleteItemAsync(key);
  await setRegistry((await getRegistry()).filter((item) => item !== key));
}

export async function clearAllDoctorConsultationDrafts() {
  const registry = await getRegistry();
  await Promise.all(registry.map((key) => SecureStore.deleteItemAsync(key)));
  await SecureStore.deleteItemAsync(DRAFT_REGISTRY);
}

function draftKey(scope: DoctorConsultationDraftScope) {
  return `${DRAFT_PREFIX}${scope.clinicId}.${scope.userId}.${scope.patientId}.${scope.visitId}.${scope.consultationId}`;
}

async function getRegistry(): Promise<string[]> {
  const payload = await SecureStore.getItemAsync(DRAFT_REGISTRY);
  if (!payload) return [];
  try {
    const parsed = JSON.parse(payload) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.startsWith(DRAFT_PREFIX)) : [];
  } catch {
    await SecureStore.deleteItemAsync(DRAFT_REGISTRY);
    return [];
  }
}

async function setRegistry(keys: string[]) {
  if (!keys.length) {
    await SecureStore.deleteItemAsync(DRAFT_REGISTRY);
    return;
  }
  await SecureStore.setItemAsync(DRAFT_REGISTRY, JSON.stringify(keys));
}
