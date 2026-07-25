export type InventoryItem = {
  id: number;
  name?: string;
  nombre?: string;
  sku?: string;
  stock?: number | string;
  stock_current?: number | string;
  unit?: string;
  unidad?: string;
  category_name?: string;
  item_type?: string;
  description?: string;
  price?: number | string;
};

export type ClinicalConsumptionPayload = {
  consultation?: number;
  visit?: number;
  item_id?: number;
  inventory_item?: number;
  item_name?: string;
  quantity: number;
  notes?: string;
  billable?: boolean;
  usage_type?: string;
  idempotency_key?: string;
};

export type DoctorClinicalConsumption = {
  id?: number;
  consultation_id?: number;
  item_id?: number;
  item_name?: string;
  inventory_item_nombre?: string;
  inventory_lot_number?: string;
  quantity?: number | string;
  unit?: string;
  billable?: boolean;
  total?: number | string;
  notes?: string | null;
  created_at?: string;
  applied_at?: string;
  status?: string;
  group_quantity?: number | string;
};
