export type CreateMedicalOrderPayload = {
  order_type: string;
  description: string;
  priority?: string;
  instructions?: string;
  consultation?: number;
  visit?: number;
};
