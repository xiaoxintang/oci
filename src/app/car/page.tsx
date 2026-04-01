import { createServerSupabase } from '@/lib/supabase/server';
import {
  attachReminderStates,
  loadCarReminderStates,
  loadCarReminders,
} from '@/lib/car/reminders';

import { formatCarSupabaseError, isCarSchemaMissing } from './errors';
import SetupNotice from './components/setup-notice';
import CarPageClient from './components/car-page-client';

export default async function CarPage() {
  const supabase = await createServerSupabase();

  const { data: cars, error: carsError } = await supabase
    .from('car')
    .select('*')
    .order('updated_at', { ascending: false });

  if (isCarSchemaMissing(carsError)) {
    return <SetupNotice />;
  }

  if (carsError) {
    throw new Error(formatCarSupabaseError(carsError, '读取车辆列表失败。'));
  }

  let reminders = [] as Awaited<ReturnType<typeof attachReminderStates>>;

  try {
    const reminderRows = await loadCarReminders(supabase);
    const stateMap = await loadCarReminderStates(
      supabase,
      reminderRows.map((row) => row.reminder_key),
    );

    reminders = attachReminderStates(reminderRows, stateMap);
  } catch (error) {
    if (isCarSchemaMissing(error)) {
      return <SetupNotice />;
    }

    throw new Error(formatCarSupabaseError(error, '读取车辆提醒失败。'));
  }

  return <CarPageClient cars={cars ?? []} reminders={reminders} />;
}
