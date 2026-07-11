import { apiClient } from '@/core/api/apiClient';

export type BirthdayExamRecord = {
  id: number;
  nombre: string;
  fecha_cumpleanos: string;
  telefono: string;
};

export type BirthdayExamPayload = {
  nombre: string;
  fecha_cumpleanos: string;
  telefono: string;
};

export async function getBirthdayExamRecords() {
  const { data } = await apiClient.get<BirthdayExamRecord[]>('/patients/birthday-exam/');
  return data;
}

export async function getBirthdayExamRecord(id: number | string) {
  const { data } = await apiClient.get<BirthdayExamRecord>(`/patients/birthday-exam/${id}/`);
  return data;
}

export async function createBirthdayExamRecord(payload: BirthdayExamPayload) {
  const { data } = await apiClient.post<BirthdayExamRecord>('/patients/birthday-exam/', payload);
  return data;
}

export async function updateBirthdayExamRecord(id: number | string, payload: Partial<BirthdayExamPayload>) {
  const { data } = await apiClient.patch<BirthdayExamRecord>(`/patients/birthday-exam/${id}/`, payload);
  return data;
}

export async function deleteBirthdayExamRecord(id: number | string) {
  await apiClient.delete(`/patients/birthday-exam/${id}/`);
}
