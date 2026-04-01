type PostgrestLikeError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

export function isCarSchemaMissing(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as PostgrestLikeError;
  const message = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();

  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    message.includes('car_reminder_view') ||
    message.includes('car_insurance_policy') ||
    message.includes('car_mileage_log') ||
    message.includes('car_maintenance_service_log') ||
    message.includes('maintenance_item_catalog')
  );
}

export function formatCarSupabaseError(
  error: unknown,
  fallbackMessage: string,
) {
  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }

  const candidate = error as PostgrestLikeError;

  if (isCarSchemaMissing(candidate)) {
    return '车辆管理相关数据库对象还没有创建，请先执行车辆模块 migration。';
  }

  return candidate.message || fallbackMessage;
}
