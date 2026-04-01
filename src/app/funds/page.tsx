import { createServerSupabase } from '@/lib/supabase/server';

import { formatSupabaseError, isFundsSchemaMissing } from './errors';
import FundsPageClient from './components/funds-page-client';
import SetupNotice from './components/setup-notice';
import {
  type CounterpartyOption,
  type DebtSummaryRow,
  type LedgerEntryRow,
} from './types';

// 这里只描述 money_ledger 表里“原始查询结果”的 shape。
// 后面我们还会手动把 counterparty_name 拼进去，组装成页面真正使用的 LedgerEntryRow。
type LedgerQueryRow = {
  amount: number;
  counterparty_id: string;
  entry_type: 'loan' | 'repayment';
  id: string;
  note: string | null;
  occurred_at: string;
  payment_method: 'wechat' | 'alipay' | 'bank_transfer' | 'cash' | 'other';
  screenshot_key: string | null;
  screenshot_url: string | null;
};

export default async function FundsPage() {
  // 这是一个 Server Component：
  // 代码运行在服务端，可以直接使用服务端 Supabase client 查询数据库。
  const supabase = await createServerSupabase();

  // 页面首屏需要 3 份数据：
  // 1. 汇总视图：每个人总共借了多少、还了多少、还欠多少
  // 2. 最近流水：最近的借出/还款记录
  // 3. 债务人列表：用于表单下拉和把 counterparty_id 映射回名字
  //
  // 用 Promise.all 并发请求，首屏会更快。
  const [summaryResult, ledgerResult, counterpartyResult] = await Promise.all([
    supabase
      .from('debt_balance_view')
      .select(
        'user_id, counterparty_id, counterparty_name, loan_total, repaid_total, outstanding_amount, last_occurred_at',
      )
      .order('outstanding_amount', { ascending: false })
      .order('counterparty_name', { ascending: true }),
    supabase
      .from('money_ledger')
      .select(
        'id, counterparty_id, entry_type, amount, occurred_at, payment_method, screenshot_url, screenshot_key, note',
      )
      // 先按时间倒序，首页只展示最近 50 条。
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('counterparty')
      .select('id, name, phone, note')
      .order('name', { ascending: true }),
  ]);

  // 如果数据库对象还没建好（例如 migration 还没执行），
  // 这里优先返回一个“初始化提示页”，而不是直接抛难读的底层错误。
  const schemaMissing =
    isFundsSchemaMissing(summaryResult.error) ||
    isFundsSchemaMissing(ledgerResult.error) ||
    isFundsSchemaMissing(counterpartyResult.error);

  if (schemaMissing) {
    return <SetupNotice />;
  }

  if (summaryResult.error) {
    throw new Error(
      formatSupabaseError(summaryResult.error, '读取账单汇总失败。'),
    );
  }

  if (ledgerResult.error) {
    throw new Error(
      formatSupabaseError(ledgerResult.error, '读取最近流水失败。'),
    );
  }

  if (counterpartyResult.error) {
    throw new Error(
      formatSupabaseError(counterpartyResult.error, '读取债务人列表失败。'),
    );
  }

  // debt_balance_view 里理论上都应该有数据，
  // 这里做一次兜底过滤，避免脏数据把页面撑坏。
  const summaryRows: DebtSummaryRow[] = (summaryResult.data ?? []).flatMap(
    (row) => {
      if (!row.user_id || !row.counterparty_id || !row.counterparty_name) {
        return [];
      }

      return [
        {
          user_id: row.user_id,
          counterparty_id: row.counterparty_id,
          counterparty_name: row.counterparty_name,
          loan_total: String(row.loan_total ?? 0),
          repaid_total: String(row.repaid_total ?? 0),
          outstanding_amount: String(row.outstanding_amount ?? 0),
          last_occurred_at: row.last_occurred_at,
        },
      ];
    },
  );

  // 把债务人列表先转成页面更好用的结构。
  const counterparties: CounterpartyOption[] = (
    counterpartyResult.data ?? []
  ).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
  }));

  // money_ledger 里只存 counterparty_id，不直接存姓名。
  // 所以这里先建一个 id -> name 的映射表，后面组装最近流水时会用到。
  const counterpartyNameMap = new Map(
    counterparties.map((row) => [row.id, row.name] as const),
  );

  // 为什么这里不直接在 SQL 里 join counterparty？
  // 因为这个项目之前遇到过 PostgREST 的关系缓存问题，
  // 直接查两张表然后在服务端拼接，调试和稳定性都会更好一点。
  const ledgerRows: LedgerEntryRow[] = (
    (ledgerResult.data ?? []) as LedgerQueryRow[]
  ).flatMap((row) => {
    const counterpartyName = counterpartyNameMap.get(row.counterparty_id);

    // 如果查到一条流水，但找不到对应债务人名字，说明数据不完整。
    // 这里选择直接跳过，避免表格里出现半残的数据。
    if (!counterpartyName) {
      return [];
    }

    return [
      {
        id: row.id,
        counterparty_id: row.counterparty_id,
        counterparty_name: counterpartyName,
        entry_type: row.entry_type,
        amount: row.amount,
        occurred_at: row.occurred_at,
        payment_method: row.payment_method,
        screenshot_url: row.screenshot_url,
        screenshot_key: row.screenshot_key,
        note: row.note,
      },
    ];
  });

  return (
    <FundsPageClient
      counterparties={counterparties}
      ledgerRows={ledgerRows}
      summaryRows={summaryRows}
    />
  );
}
