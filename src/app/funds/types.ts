import { Database } from '@/types/database.types';

export type LedgerEntryType = Database['public']['Enums']['ledger_entry_type'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];

type CounterpartyTableRow = Database['public']['Tables']['counterparty']['Row'];
type MoneyLedgerTableRow = Database['public']['Tables']['money_ledger']['Row'];

export type CounterpartyOption = Pick<
  CounterpartyTableRow,
  'id' | 'name' | 'phone' | 'note'
>;

export type DebtSummaryRow = {
  user_id: string;
  counterparty_id: string;
  counterparty_name: string;
  loan_total: string;
  repaid_total: string;
  outstanding_amount: string;
  last_occurred_at: string | null;
};

export type LedgerEntryRow = Pick<
  MoneyLedgerTableRow,
  | 'id'
  | 'counterparty_id'
  | 'entry_type'
  | 'amount'
  | 'occurred_at'
  | 'payment_method'
  | 'screenshot_url'
  | 'screenshot_key'
  | 'note'
> & {
  counterparty_name: string;
};

export type LedgerFormValues = {
  entryType: LedgerEntryType;
  counterpartyId: string;
  counterpartyName: string;
  amount: string;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  screenshotUrl: string;
  screenshotKey: string;
  note: string;
};

export type LedgerDialogMode = 'create' | 'edit';

export type SummaryFilter = 'open' | 'settled' | 'all';

export const ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  loan: '借出',
  repayment: '还款',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wechat: '微信',
  alipay: '支付宝',
  bank_transfer: '银行卡转账',
  cash: '现金',
  other: '其他',
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  'wechat',
  'alipay',
  'bank_transfer',
  'cash',
  'other',
];

export const SUMMARY_FILTER_OPTIONS: Array<{
  label: string;
  value: SummaryFilter;
}> = [
  {
    label: '未结清',
    value: 'open',
  },
  {
    label: '全部',
    value: 'all',
  },
  {
    label: '已结清',
    value: 'settled',
  },
];
