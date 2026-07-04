import { endpoints } from '@/core/api/endpoints';
import { getFirstAvailable } from '@/features/doctor/services/doctorApiHelpers';
import { normalizeListResponse, type ApiListResponse } from '@/features/doctor/types/commonDoctor.types';
import type { InventoryItem } from '@/features/doctor/types/doctorClinicalConsumption.types';

export async function getMedicationCatalog(search?: string) {
  const data = await getFirstAvailable<ApiListResponse<InventoryItem>>(
    [endpoints.doctor.inventoryItems],
    { params: { active: 'true', item_type: 'medicamento', search: search?.trim() || undefined } },
  );
  return normalizeListResponse(data);
}

export async function getMedicalOrderCatalog(search?: string, type?: string) {
  const itemType = type === 'laboratorio' ? 'laboratorio' : type === 'procedimiento' ? 'insumo' : undefined;
  const data = await getFirstAvailable<ApiListResponse<InventoryItem>>(
    [endpoints.doctor.inventoryItems],
    { params: { active: 'true', item_type: itemType, search: search?.trim() || undefined } },
  );
  return normalizeListResponse(data);
}
