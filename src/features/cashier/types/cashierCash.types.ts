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
  payments_count?: number;
  movements_count?: number;
  payment_method_totals?: Record<string, number | string>;
  status?: CashSessionStatus;
  notes?: string;
  movements?: CashMovement[];
};

export type CashSummary = {
  date?: string;
  open_sessions?: number;
  closed_sessions?: number;
  opening_total?: number | string;
  closing_total?: number | string;
  difference_total?: number | string;
  cash_payments?: number | string;
  card_payments?: number | string;
  transfer_payments?: number | string;
  other_payments?: number | string;
  manual_income?: number | string;
  manual_expense?: number | string;
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
