type PostgrestLikeError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

export function isFundsSchemaMissing(error: unknown) {
  // Supabase/PostgREST 的错误对象不是固定 class，
  // 这里按“像不像一个 PostgREST 错误”来做宽松判断。
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as PostgrestLikeError;
  const message = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();

  // 这里主要识别“表 / 视图 / 关系不存在”的场景，
  // 也就是 migration 没跑完、数据库对象缺失的情况。
  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    message.includes('debt_balance_view') ||
    message.includes('money_ledger') ||
    message.includes('counterparty')
  );
}

export function formatSupabaseError(
  error: unknown,
  fallbackMessage: string,
) {
  // 前端直接展示底层错误通常不太友好，
  // 这里统一把 Supabase 错误翻译成更容易理解的中文提示。
  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }

  const candidate = error as PostgrestLikeError;

  if (isFundsSchemaMissing(candidate)) {
    return '资金账单相关数据库对象还没有创建，请先执行 Supabase migration。';
  }

  return candidate.message || fallbackMessage;
}
