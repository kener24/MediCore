import api from "./axios";
import type { ClinicSettings, ClinicSettingsPayload, ClinicWorkflowSettings, ClinicWorkflowSettingsPayload } from "../types/clinicSettings";

export async function getMyClinicSettings() { const { data } = await api.get<ClinicSettings>("/clinic-settings/my-settings/"); return data; }
export async function updateMyClinicSettings(payload: ClinicSettingsPayload) { const { data } = await api.patch<ClinicSettings>("/clinic-settings/my-settings/", payload); return data; }
export async function getClinicSettingsByClinicId(clinicId: number | string) { const { data } = await api.get<ClinicSettings>(`/clinic-settings/clinics/${clinicId}/`); return data; }
export async function updateClinicSettingsByClinicId(clinicId: number | string, payload: ClinicSettingsPayload) { const { data } = await api.patch<ClinicSettings>(`/clinic-settings/clinics/${clinicId}/`, payload); return data; }
export async function getPublicClinicSettings(clinicId: number | string) { const { data } = await api.get(`/clinic-settings/public/${clinicId}/`); return data; }
export async function getClinicSettingsSummary() { const { data } = await api.get("/clinic-settings/summary/"); return data; }
export async function getClinicWorkflowSettings() { const { data } = await api.get<ClinicWorkflowSettings>("/clinic/workflow-settings/"); return data; }
export async function updateClinicWorkflowSettings(payload: ClinicWorkflowSettingsPayload) { const { data } = await api.patch<ClinicWorkflowSettings>("/clinic/workflow-settings/", payload); return data; }
