import { notFound } from 'next/navigation';

import { createServerSupabase } from '@/lib/supabase/server';
import {
  attachReminderStates,
  loadCarReminderStates,
  loadCarReminders,
} from '@/lib/car/reminders';

import { formatCarSupabaseError, isCarSchemaMissing } from '../errors';
import SetupNotice from '../components/setup-notice';
import CarDetailPageClient from '../components/car-detail-page-client';

type CarDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CarDetailPage({ params }: CarDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [
    carResult,
    mileageLogsResult,
    insurancePoliciesResult,
    maintenanceCatalogResult,
    maintenanceConfigsResult,
    maintenanceLogsResult,
    reminderStatesResult,
  ] = await Promise.all([
    supabase.from('car').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('car_mileage_log')
      .select('*')
      .eq('car_id', id)
      .order('recorded_at', { ascending: false })
      .limit(50),
    supabase
      .from('car_insurance_policy')
      .select('*')
      .eq('car_id', id)
      .order('effective_end_at', { ascending: false }),
    supabase
      .from('maintenance_item_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true }),
    supabase
      .from('car_maintenance_config')
      .select('*')
      .eq('car_id', id)
      .order('item_code', { ascending: true }),
    supabase
      .from('car_maintenance_service_log')
      .select('*')
      .eq('car_id', id)
      .order('performed_at', { ascending: false })
      .limit(100),
    supabase
      .from('car_reminder_state')
      .select('*')
      .eq('car_id', id)
      .order('updated_at', { ascending: false }),
  ]);

  const schemaMissing =
    isCarSchemaMissing(carResult.error) ||
    isCarSchemaMissing(mileageLogsResult.error) ||
    isCarSchemaMissing(insurancePoliciesResult.error) ||
    isCarSchemaMissing(maintenanceCatalogResult.error) ||
    isCarSchemaMissing(maintenanceConfigsResult.error) ||
    isCarSchemaMissing(maintenanceLogsResult.error) ||
    isCarSchemaMissing(reminderStatesResult.error);

  if (schemaMissing) {
    return <SetupNotice />;
  }

  if (carResult.error) {
    throw new Error(formatCarSupabaseError(carResult.error, '读取车辆详情失败。'));
  }

  if (!carResult.data) {
    notFound();
  }

  if (mileageLogsResult.error) {
    throw new Error(
      formatCarSupabaseError(mileageLogsResult.error, '读取里程历史失败。'),
    );
  }

  if (insurancePoliciesResult.error) {
    throw new Error(
      formatCarSupabaseError(insurancePoliciesResult.error, '读取保险记录失败。'),
    );
  }

  if (maintenanceCatalogResult.error) {
    throw new Error(
      formatCarSupabaseError(maintenanceCatalogResult.error, '读取保养项目失败。'),
    );
  }

  if (maintenanceConfigsResult.error) {
    throw new Error(
      formatCarSupabaseError(maintenanceConfigsResult.error, '读取保养周期配置失败。'),
    );
  }

  if (maintenanceLogsResult.error) {
    throw new Error(
      formatCarSupabaseError(maintenanceLogsResult.error, '读取保养历史失败。'),
    );
  }

  if (reminderStatesResult.error) {
    throw new Error(
      formatCarSupabaseError(reminderStatesResult.error, '读取提醒状态失败。'),
    );
  }

  let reminders = [] as Awaited<ReturnType<typeof attachReminderStates>>;

  try {
    const reminderRows = await loadCarReminders(supabase, {
      carIds: [id],
    });
    const stateMap = await loadCarReminderStates(
      supabase,
      reminderRows.map((row) => row.reminder_key),
    );

    reminders = attachReminderStates(reminderRows, stateMap);
  } catch (error) {
    if (isCarSchemaMissing(error)) {
      return <SetupNotice />;
    }

    throw new Error(formatCarSupabaseError(error, '读取提醒失败。'));
  }

  const reminderKeys = reminderStatesResult.data.map((row) => row.reminder_key);
  const { data: deliveryLogs, error: deliveryLogsError } = reminderKeys.length
    ? await supabase
        .from('car_reminder_delivery_log')
        .select('*')
        .in('reminder_key', reminderKeys)
        .order('sent_at', { ascending: false })
        .limit(100)
    : { data: [], error: null };

  if (deliveryLogsError) {
    throw new Error(
      formatCarSupabaseError(deliveryLogsError, '读取提醒发送日志失败。'),
    );
  }

  return (
    <CarDetailPageClient
      car={carResult.data}
      deliveryLogs={deliveryLogs ?? []}
      insurancePolicies={insurancePoliciesResult.data ?? []}
      maintenanceCatalog={maintenanceCatalogResult.data ?? []}
      maintenanceConfigs={maintenanceConfigsResult.data ?? []}
      maintenanceLogs={maintenanceLogsResult.data ?? []}
      mileageLogs={mileageLogsResult.data ?? []}
      reminders={reminders}
    />
  );
}
