import { sendDingTalkTextMessage } from '@/lib/dingtalk';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { Json } from '@/types/database.types';

import {
  type CarReminderStateRow,
  type CarReminderViewRow,
  type ReminderChannel,
  type ReminderRunMode,
  type ReminderType,
  REMINDER_SEVERITY_LABELS,
  REMINDER_TYPE_LABELS,
} from '@/app/car/types';

type ReminderSupabaseClient =
  | Awaited<ReturnType<typeof createServerSupabase>>
  | Awaited<ReturnType<typeof createAdminSupabase>>;

export type ReminderChannelPayload = {
  carName?: string;
  category?: string;
  contactName?: string;
  contactPhone?: string;
  daysRemaining?: number;
  dueAt?: string;
  dueKm?: number;
  currentKm?: number;
  itemCode?: string;
  insuranceType?: string;
  label?: string;
  plateNumber?: string | null;
  remainingKm?: number;
};

export type NormalizedCarReminder = {
  car_id: string;
  car_name: string;
  channel_payload: ReminderChannelPayload | null;
  due_at: string | null;
  due_km: number | null;
  plate_number: string | null;
  reminder_key: string;
  reminder_type: ReminderType;
  severity: string;
  source_id: string;
  title: string;
  user_id: string;
};

export type CarReminderWithState = NormalizedCarReminder & {
  acknowledged_at: string | null;
  last_notified_at: string | null;
  last_notified_channel: string | null;
  resolved_at: string | null;
};

export type RunReminderJobInput = {
  carIds?: string[];
  channel?: ReminderChannel;
  force?: boolean;
  mode?: ReminderRunMode;
  reminderTypes?: ReminderType[];
};

const DEFAULT_REMINDER_TYPES: ReminderType[] = ['insurance', 'maintenance'];

function isReminderType(value: string): value is ReminderType {
  return value === 'insurance' || value === 'maintenance';
}

function normalizeChannelPayload(value: Json | null): ReminderChannelPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as ReminderChannelPayload;
}

function normalizeReminderRows(rows: CarReminderViewRow[]) {
  return rows.flatMap<NormalizedCarReminder>((row) => {
    if (
      !row.car_id ||
      !row.car_name ||
      !row.reminder_key ||
      !row.reminder_type ||
      !row.source_id ||
      !row.title ||
      !row.user_id ||
      !row.severity ||
      !isReminderType(row.reminder_type)
    ) {
      return [];
    }

    return [
      {
        car_id: row.car_id,
        car_name: row.car_name,
        channel_payload: normalizeChannelPayload(row.channel_payload),
        due_at: row.due_at,
        due_km: row.due_km,
        plate_number: row.plate_number,
        reminder_key: row.reminder_key,
        reminder_type: row.reminder_type,
        severity: row.severity,
        source_id: row.source_id,
        title: row.title,
        user_id: row.user_id,
      },
    ];
  });
}

export async function loadCarReminders(
  supabase: ReminderSupabaseClient,
  options: {
    carIds?: string[];
    reminderTypes?: ReminderType[];
  } = {},
) {
  let query = supabase
    .from('car_reminder_view')
    .select('*')
    .order('due_at', { ascending: true });

  if (options.reminderTypes?.length) {
    query = query.in('reminder_type', options.reminderTypes);
  }

  if (options.carIds?.length) {
    query = query.in('car_id', options.carIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return normalizeReminderRows(data ?? []);
}

export async function loadCarReminderStates(
  supabase: ReminderSupabaseClient,
  reminderKeys: string[],
) {
  if (!reminderKeys.length) {
    return new Map<string, CarReminderStateRow>();
  }

  const { data, error } = await supabase
    .from('car_reminder_state')
    .select('*')
    .in('reminder_key', reminderKeys);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.reminder_key, row] as const));
}

export function attachReminderStates(
  reminders: NormalizedCarReminder[],
  stateMap: Map<string, CarReminderStateRow>,
) {
  return reminders.map<CarReminderWithState>((reminder) => {
    const state = stateMap.get(reminder.reminder_key);

    return {
      ...reminder,
      acknowledged_at: state?.acknowledged_at ?? null,
      last_notified_at: state?.last_notified_at ?? null,
      last_notified_channel: state?.last_notified_channel ?? null,
      resolved_at: state?.resolved_at ?? null,
    };
  });
}

function isSameCalendarDay(left: string | null, right: string) {
  if (!left) {
    return false;
  }

  return left.slice(0, 10) === right.slice(0, 10);
}

function getReminderPrefix(reminderType: ReminderType) {
  return `${reminderType}:`;
}

export async function resolveInactiveReminderStates(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  activeReminders: NormalizedCarReminder[],
  options: {
    carIds?: string[];
    reminderTypes?: ReminderType[];
  } = {},
) {
  const activeReminderKeys = new Set(activeReminders.map((row) => row.reminder_key));
  const reminderTypes = options.reminderTypes?.length
    ? options.reminderTypes
    : DEFAULT_REMINDER_TYPES;

  let query = supabase
    .from('car_reminder_state')
    .select('reminder_key, car_id')
    .is('resolved_at', null);

  if (options.carIds?.length) {
    query = query.in('car_id', options.carIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const prefixes = reminderTypes.map(getReminderPrefix);
  const inactiveReminderKeys = (data ?? [])
    .map((row) => row.reminder_key)
    .filter(
      (reminderKey) =>
        prefixes.some((prefix) => reminderKey.startsWith(prefix)) &&
        !activeReminderKeys.has(reminderKey),
    );

  if (!inactiveReminderKeys.length) {
    return;
  }

  const { error: updateError } = await supabase
    .from('car_reminder_state')
    .update({
      resolved_at: new Date().toISOString(),
    })
    .in('reminder_key', inactiveReminderKeys);

  if (updateError) {
    throw updateError;
  }
}

function compareReminderSeverity(left: CarReminderWithState, right: CarReminderWithState) {
  const severityRank: Record<string, number> = {
    expired: 0,
    due_30d_and_100km: 1,
    due_30d: 2,
    due_100km: 3,
  };

  return (
    (severityRank[left.severity] ?? 99) - (severityRank[right.severity] ?? 99)
  );
}

export function formatReminderDingTalkMessage(reminders: CarReminderWithState[]) {
  const effectiveReminders = reminders
    .filter((row) => !row.acknowledged_at && !row.resolved_at)
    .sort((left, right) => compareReminderSeverity(left, right));

  if (!effectiveReminders.length) {
    return '车辆提醒：当前没有需要发送的项目。';
  }

  const groups: Array<{ label: string; items: CarReminderWithState[] }> = [
    {
      label: '已逾期',
      items: effectiveReminders.filter((row) => row.severity === 'expired'),
    },
    {
      label: '30 天内到期',
      items: effectiveReminders.filter((row) =>
        row.severity === 'due_30d' || row.severity === 'due_30d_and_100km',
      ),
    },
    {
      label: '100 公里内到期',
      items: effectiveReminders.filter((row) =>
        row.severity === 'due_100km' || row.severity === 'due_30d_and_100km',
      ),
    },
  ];

  const lines = ['车辆提醒汇总'];

  for (const group of groups) {
    if (!group.items.length) {
      continue;
    }

    lines.push('');
    lines.push(`【${group.label}】`);

    for (const row of group.items) {
      const payload = row.channel_payload;
      const plateText = row.plate_number ? `（${row.plate_number}）` : '';
      const dueDateText = row.due_at ? `时间：${row.due_at.slice(0, 10)}` : null;
      const dueKmText =
        typeof row.due_km === 'number' ? `里程：${row.due_km.toFixed(1)} km` : null;
      const remainingKmText =
        typeof payload?.remainingKm === 'number'
          ? `剩余：${payload.remainingKm.toFixed(1)} km`
          : null;

      lines.push(
        `- [${REMINDER_TYPE_LABELS[row.reminder_type]}] ${row.car_name}${plateText} ${row.title} ${[
          dueDateText,
          dueKmText,
          remainingKmText,
          REMINDER_SEVERITY_LABELS[row.severity] ?? row.severity,
        ]
          .filter(Boolean)
          .join(' | ')}`,
      );
    }
  }

  return lines.join('\n');
}

export async function runCarReminderJob(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  input: RunReminderJobInput,
) {
  const reminderTypes = input.reminderTypes?.length
    ? input.reminderTypes
    : DEFAULT_REMINDER_TYPES;
  const mode = input.mode ?? 'preview';
  const channel = input.channel ?? 'dingtalk';
  const force = Boolean(input.force);
  const nowIsoString = new Date().toISOString();

  const activeReminders = await loadCarReminders(supabase, {
    carIds: input.carIds,
    reminderTypes,
  });

  await resolveInactiveReminderStates(supabase, activeReminders, {
    carIds: input.carIds,
    reminderTypes,
  });

  const stateMap = await loadCarReminderStates(
    supabase,
    activeReminders.map((row) => row.reminder_key),
  );
  const remindersWithState = attachReminderStates(activeReminders, stateMap);

  if (mode === 'preview') {
    return {
      message: '已完成提醒预览计算。',
      mode,
      reminders: remindersWithState,
      sentCount: 0,
    };
  }

  const sendableReminders = remindersWithState.filter((row) => {
    if (row.acknowledged_at || row.resolved_at) {
      return false;
    }

    if (force) {
      return true;
    }

    return !isSameCalendarDay(row.last_notified_at, nowIsoString);
  });

  if (!sendableReminders.length) {
    return {
      message: '当前没有需要发送的新提醒。',
      mode,
      reminders: remindersWithState,
      sentCount: 0,
    };
  }

  if (channel !== 'dingtalk') {
    throw new Error('当前仅支持钉钉群机器人通知。');
  }

  const messageText = formatReminderDingTalkMessage(sendableReminders);
  const sendResult = await sendDingTalkTextMessage({
    content: messageText,
    atMobiles: process.env.DINGTALK_AT_MOBILE
      ? process.env.DINGTALK_AT_MOBILE.split(',').map((item) => item.trim())
      : [],
  });

  const { error: stateError } = await supabase.from('car_reminder_state').upsert(
    sendableReminders.map((row) => ({
      reminder_key: row.reminder_key,
      user_id: row.user_id,
      car_id: row.car_id,
      last_notified_at: nowIsoString,
      last_notified_channel: channel,
      resolved_at: null,
    })),
    {
      onConflict: 'reminder_key',
    },
  );

  if (stateError) {
    throw stateError;
  }

  const { error: deliveryLogError } = await supabase
    .from('car_reminder_delivery_log')
    .insert(
      sendableReminders.map((row) => ({
        reminder_key: row.reminder_key,
        channel,
        response_excerpt: sendResult.responseText.slice(0, 1000),
        sent_at: nowIsoString,
        status: sendResult.ok ? 'sent' : 'failed',
      })),
    );

  if (deliveryLogError) {
    throw deliveryLogError;
  }

  return {
    message: sendResult.ok ? '提醒已发送到钉钉。' : '提醒发送已执行，但钉钉返回失败。',
    mode,
    reminders: remindersWithState,
    sentCount: sendableReminders.length,
  };
}
