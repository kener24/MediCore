export type CashSessionStatus = 'abierta' | 'cerrada' | string;

export type CashMovementType = 'ingreso' | 'egreso';

export type CashMovement = {
  id?: number;
  movement_type?: CashMovementType;
  amount?: number | string;
  reason?: string;
  notes?: string;
  created_by_nombre?: string;
  creado_en?: string;
  created_at?: string;
};

export type CashSession = {
  id: number;
  opening_datetime?: string;
  closing_datetime?: string | null;
  opening_amount?: number | string;
  closing_amount?: number | string | null;
  expected_amount?: number | string;
  expected_amount_live?: number | string;
  difference_amount?: number | string;
  cash_total?: number | string;
  income_total?: number | string;
  expense_total?: number | string;
  status?: CashSessionStatus;
  notes?: string;
  movements?: CashMovement[];
};

export type OpenCashSessionPayload = {
  opening_amount: number | string;
  notes?: string;
};

export type CloseCashSessionPayload = {
  closing_amount: number | string;
  notes?: string;
};

export type CreateCashMovementPayload = {
  movement_type: CashMovementType;
  amount: number | string;
  reason: string;
  notes?: string;
};
