import * as SecureStore from 'expo-secure-store';

import type { CreateMedicalOrderPayload } from '@/features/doctor/types/doctorMedicalOrder.types';
import type { PrescriptionMedicationPayload } from '@/features/doctor/types/doctorPrescription.types';

const MEDICATIONS_KEY = 'medicore.doctor.favoriteMedications';
const ORDERS_KEY = 'medicore.doctor.favoriteOrders';
const MAX_FAVORITES = 12;

export async function getFavoriteMedications() {
  return readList<PrescriptionMedicationPayload>(MEDICATIONS_KEY);
}

export async function rememberMedication(item: PrescriptionMedicationPayload) {
  if (!item.medication_name.trim()) return;
  const current = await getFavoriteMedications();
  const normalizedName = item.medication_name.trim().toLowerCase();
  const next = [
    item,
    ...current.filter((value) => value.medication_name.trim().toLowerCase() !== normalizedName),
  ].slice(0, MAX_FAVORITES);
  await writeList(MEDICATIONS_KEY, next);
}

export async function getFavoriteOrders() {
  return readList<CreateMedicalOrderPayload>(ORDERS_KEY);
}

export async function rememberMedicalOrder(item: CreateMedicalOrderPayload) {
  if (!item.description.trim()) return;
  const current = await getFavoriteOrders();
  const normalized = `${item.order_type}-${item.description}`.trim().toLowerCase();
  const next = [
    item,
    ...current.filter((value) => `${value.order_type}-${value.description}`.trim().toLowerCase() !== normalized),
  ].slice(0, MAX_FAVORITES);
  await writeList(ORDERS_KEY, next);
}

export async function clearDoctorFavorites() {
  await Promise.all([
    SecureStore.deleteItemAsync(MEDICATIONS_KEY),
    SecureStore.deleteItemAsync(ORDERS_KEY),
  ]);
}

async function readList<T>(key: string): Promise<T[]> {
  const payload = await SecureStore.getItemAsync(key);
  if (!payload) return [];
  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await SecureStore.deleteItemAsync(key);
    return [];
  }
}

async function writeList<T>(key: string, values: T[]) {
  await SecureStore.setItemAsync(key, JSON.stringify(values));
}
