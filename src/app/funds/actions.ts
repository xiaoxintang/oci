'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabase } from '@/lib/supabase/server';
import { toNumberValue } from '@/lib/time';
import { Database } from '@/types/database.types';

import { formatSupabaseError } from './errors';
import {
  type LedgerFormValues,
  type LedgerEntryType,
  type PaymentMethod,
  PAYMENT_METHOD_OPTIONS,
} from './types';

// 这两个类型直接取自 Supabase 自动生成的 database.types.ts，
// 这样数据库字段一变，TypeScript 这里也会同步跟着报错/提示。
type CounterpartyInsert = Database['public']['Tables']['counterparty']['Insert'];
type MoneyLedgerInsert = Database['public']['Tables']['money_ledger']['Insert'];
type MoneyLedgerUpdate = Database['public']['Tables']['money_ledger']['Update'];
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>;

type UpsertCounterpartyInput = {
  counterpartyId?: string | null;
  name?: string | null;
  phone?: string | null;
  note?: string | null;
};

type CounterpartyRecord = {
  id: string;
  name: string;
};

type ExistingLedgerRecord = Pick<
  Database['public']['Tables']['money_ledger']['Row'],
  'id' | 'amount' | 'counterparty_id' | 'entry_type'
>;

// 账单类型目前只有两种：
// loan = 我借给别人钱
// repayment = 别人还钱给我
const LEDGER_ENTRY_TYPES: LedgerEntryType[] = ['loan', 'repayment'];

// 表单里很多输入都允许空字符串，这里统一转成 null，
// 这样数据库里不会出现一堆 ""。
const cleanText = (value: string | null | undefined) => {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
};

// 金额相关校验尽量统一按“分”比较，避免 0.1 + 0.2 这类浮点误差。
const toAmountInCents = (value: string | number | null | undefined) =>
  Math.round(toNumberValue(value) * 100);

const toOutstandingDeltaInCents = (
  entryType: LedgerEntryType,
  amount: string | number | null | undefined,
) => {
  const amountInCents = toAmountInCents(amount);
  return entryType === 'loan' ? amountInCents : -amountInCents;
};

async function requireAuthenticatedContext() {
  // Server Action 运行在服务端，所以可以直接拿到当前登录用户。
  // 如果没登录，就阻止继续写数据库。
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('请先登录后再继续。');
  }

  return {
    supabase,
    user,
  };
}

function assertLedgerEntryType(value: string): LedgerEntryType {
  if (!LEDGER_ENTRY_TYPES.includes(value as LedgerEntryType)) {
    throw new Error('账单类型不合法。');
  }

  return value as LedgerEntryType;
}

function assertPaymentMethod(value: string): PaymentMethod {
  if (!PAYMENT_METHOD_OPTIONS.includes(value as PaymentMethod)) {
    throw new Error('支付方式不合法。');
  }

  return value as PaymentMethod;
}

async function readOutstandingMap(
  supabase: SupabaseClient,
  counterpartyIds: string[],
) {
  if (!counterpartyIds.length) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from('debt_balance_view')
    .select('counterparty_id, outstanding_amount')
    .in('counterparty_id', counterpartyIds);

  if (error) {
    throw new Error(formatSupabaseError(error, '读取待还金额失败。'));
  }

  return new Map(
    (data ?? []).flatMap((row) => {
      if (!row.counterparty_id) {
        return [];
      }

      return [[row.counterparty_id, toAmountInCents(row.outstanding_amount)]];
    }),
  );
}

async function assertLedgerBalanceChange(
  supabase: SupabaseClient,
  nextEntry: {
    amount: number;
    counterpartyId: string;
    entryType: LedgerEntryType;
  },
  currentEntry?: ExistingLedgerRecord,
) {
  // 这段逻辑是“编辑流水”最关键的地方：
  // 本质上是在检查这次改动会不会让某个债务人的待还金额变成负数。
  // 如果会变成负数，说明“已还 > 借出”，业务上不成立。
  const relatedCounterpartyIds = [
    ...new Set(
      [currentEntry?.counterparty_id, nextEntry.counterpartyId].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  const outstandingMap = await readOutstandingMap(
    supabase,
    relatedCounterpartyIds,
  );
  const nextDeltaInCents = toOutstandingDeltaInCents(
    nextEntry.entryType,
    nextEntry.amount,
  );

  if (!currentEntry) {
    const nextOutstandingInCents =
      (outstandingMap.get(nextEntry.counterpartyId) ?? 0) + nextDeltaInCents;

    if (nextOutstandingInCents < 0) {
      throw new Error('还款金额不能超过当前待还金额。');
    }

    return;
  }

  const currentDeltaInCents = toOutstandingDeltaInCents(
    currentEntry.entry_type,
    currentEntry.amount,
  );
  const currentCounterpartyOutstandingInCents =
    outstandingMap.get(currentEntry.counterparty_id) ?? 0;

  if (currentEntry.counterparty_id === nextEntry.counterpartyId) {
    const nextOutstandingInCents =
      currentCounterpartyOutstandingInCents -
      currentDeltaInCents +
      nextDeltaInCents;

    if (nextOutstandingInCents < 0) {
      throw new Error('当前修改会导致已还金额大于借出金额，请调整金额。');
    }

    return;
  }

  const currentCounterpartyNextOutstandingInCents =
    currentCounterpartyOutstandingInCents - currentDeltaInCents;

  if (currentCounterpartyNextOutstandingInCents < 0) {
    throw new Error('当前修改会导致原债务人的已还金额大于借出金额，请调整金额。');
  }

  const nextCounterpartyOutstandingInCents =
    (outstandingMap.get(nextEntry.counterpartyId) ?? 0) + nextDeltaInCents;

  if (nextCounterpartyOutstandingInCents < 0) {
    throw new Error('还款金额不能超过目标债务人的当前待还金额。');
  }
}

async function upsertCounterpartyRecord(
  supabase: SupabaseClient,
  userId: string,
  values: UpsertCounterpartyInput,
): Promise<CounterpartyRecord> {
  const counterpartyId = cleanText(values.counterpartyId);

  // 情况 1：前端已经选中了现有债务人，直接回查确认一下这条记录存在。
  if (counterpartyId) {
    const { data, error } = await supabase
      .from('counterparty')
      .select('id, name')
      .eq('id', counterpartyId)
      .single();

    if (error || !data) {
      throw new Error('未找到对应的债务人。');
    }

    return data;
  }

  const name = cleanText(values.name);

  // 情况 2：没有选现有债务人，那就必须输入一个新名字。
  if (!name) {
    throw new Error('请先选择债务人，或者输入新的债务人姓名。');
  }

  // 这里先按名字查一遍，避免用户多次输入同名联系人时重复建档。
  // ilike 是大小写不敏感匹配，但我们下面还会做一次更严格的 trim + lower 比较。
  const { data: existingRows, error: existingError } = await supabase
    .from('counterparty')
    .select('id, name')
    .ilike('name', name)
    .limit(10);

  if (existingError) {
    throw new Error(formatSupabaseError(existingError, '读取债务人失败。'));
  }

  const matchedCounterparty = existingRows?.find(
    (item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (matchedCounterparty) {
    return matchedCounterparty;
  }

  // 真正需要新建债务人时，再 insert。
  const insertValues: CounterpartyInsert = {
    user_id: userId,
    name,
    phone: cleanText(values.phone),
    note: cleanText(values.note),
  };

  const { data, error } = await supabase
    .from('counterparty')
    .insert(insertValues)
    .select('id, name')
    .single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error, '创建债务人失败。'));
  }

  return data;
}

export async function upsertCounterparty(values: UpsertCounterpartyInput) {
  // 这个 action 目前主要是给“单独新建债务人”场景预留的。
  // 真正录入账单时，也会复用同一套 upsert 逻辑。
  const { supabase, user } = await requireAuthenticatedContext();
  const counterparty = await upsertCounterpartyRecord(supabase, user.id, values);
  revalidatePath('/funds');
  return counterparty;
}

export async function createLedgerEntry(values: LedgerFormValues) {
  // Server Action:
  // 前端弹窗点“保存账单”后，会直接调用这个函数写数据库。
  const { supabase, user } = await requireAuthenticatedContext();
  const entryType = assertLedgerEntryType(values.entryType);
  const paymentMethod = assertPaymentMethod(values.paymentMethod);
  const amount = toNumberValue(values.amount);

  if (amount <= 0) {
    throw new Error('请输入大于 0 的金额。');
  }

  const occurredAt = new Date(values.occurredAt);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('请选择有效的交易时间。');
  }

  // 先确保债务人存在：
  // 有现成的就复用，没有就自动新建。
  const counterparty = await upsertCounterpartyRecord(supabase, user.id, {
    counterpartyId: values.counterpartyId,
    name: values.counterpartyName,
  });

  await assertLedgerBalanceChange(supabase, {
    amount,
    counterpartyId: counterparty.id,
    entryType,
  });

  // 真正写入的是 money_ledger 流水表。
  // dashboard 和汇总表，后面都是从这张流水表聚合出来的。
  const insertValues: MoneyLedgerInsert = {
    user_id: user.id,
    counterparty_id: counterparty.id,
    entry_type: entryType,
    amount: Number(amount.toFixed(2)),
    occurred_at: occurredAt.toISOString(),
    payment_method: paymentMethod,
    screenshot_url: cleanText(values.screenshotUrl),
    screenshot_key: cleanText(values.screenshotKey),
    note: cleanText(values.note),
  };

  const { data, error } = await supabase
    .from('money_ledger')
    .insert(insertValues)
    .select('id, counterparty_id')
    .single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error, '账单录入失败。'));
  }

  // 写入成功后让 /funds 重新获取服务端数据，
  // 这样列表和 dashboard 刷新后就是最新状态。
  revalidatePath('/funds');

  return data;
}

export async function updateLedgerEntry(id: string, values: LedgerFormValues) {
  // 编辑和新增共用同一套表单，但服务端会先读取旧流水，
  // 再判断“这次修改前后”的余额变化是否安全。
  const { supabase, user } = await requireAuthenticatedContext();
  const entryType = assertLedgerEntryType(values.entryType);
  const paymentMethod = assertPaymentMethod(values.paymentMethod);
  const amount = toNumberValue(values.amount);

  if (amount <= 0) {
    throw new Error('请输入大于 0 的金额。');
  }

  const occurredAt = new Date(values.occurredAt);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('请选择有效的交易时间。');
  }

  const { data: currentEntry, error: currentEntryError } = await supabase
    .from('money_ledger')
    .select('id, counterparty_id, entry_type, amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (currentEntryError || !currentEntry) {
    throw new Error(formatSupabaseError(currentEntryError, '未找到要编辑的流水。'));
  }

  const counterparty = await upsertCounterpartyRecord(supabase, user.id, {
    counterpartyId: values.counterpartyId,
    name: values.counterpartyName,
  });

  await assertLedgerBalanceChange(
    supabase,
    {
      amount,
      counterpartyId: counterparty.id,
      entryType,
    },
    currentEntry,
  );

  const updateValues: MoneyLedgerUpdate = {
    counterparty_id: counterparty.id,
    entry_type: entryType,
    amount: Number(amount.toFixed(2)),
    occurred_at: occurredAt.toISOString(),
    payment_method: paymentMethod,
    screenshot_url: cleanText(values.screenshotUrl),
    screenshot_key: cleanText(values.screenshotKey),
    note: cleanText(values.note),
  };

  const { data, error } = await supabase
    .from('money_ledger')
    .update(updateValues)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, counterparty_id')
    .single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error, '更新账单失败。'));
  }

  revalidatePath('/funds');

  return data;
}
