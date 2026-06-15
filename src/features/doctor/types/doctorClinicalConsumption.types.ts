export type ClinicalConsumptionPayload = {
  item_id?: number;
  item_name?: string;
  quantity: number;
  notes?: string;
  billable?: boolean;
  consultation?: number;
  visit?: number;
};
