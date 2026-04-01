import { NextRequest, NextResponse } from 'next/server';

import {
  type ReminderChannel,
  type ReminderRunMode,
  type ReminderType,
  REMINDER_CHANNEL_OPTIONS,
  REMINDER_TYPE_OPTIONS,
} from '@/app/car/types';
import { runCarReminderJob } from '@/lib/car/reminders';
import { createAdminSupabase } from '@/lib/supabase/server';

type RunReminderRequestBody = {
  carIds?: string[];
  channel?: string;
  force?: boolean;
  mode?: string;
  reminderTypes?: string[];
};

function toBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLocaleLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function assertReminderMode(value: string | undefined): ReminderRunMode {
  if (value === 'notify') {
    return value;
  }

  return 'preview';
}

function assertReminderTypes(value: string[] | undefined): ReminderType[] {
  if (!value?.length) {
    return REMINDER_TYPE_OPTIONS;
  }

  const parsed = value.filter((item): item is ReminderType =>
    REMINDER_TYPE_OPTIONS.includes(item as ReminderType),
  );

  if (!parsed.length) {
    throw new Error('reminderTypes 不合法。');
  }

  return parsed;
}

function assertReminderChannel(value: string | undefined): ReminderChannel {
  if (!value) {
    return 'dingtalk';
  }

  if (!REMINDER_CHANNEL_OPTIONS.includes(value as ReminderChannel)) {
    throw new Error('channel 不合法。');
  }

  return value as ReminderChannel;
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.CAR_REMINDER_CRON_TOKEN;
  const requestToken = toBearerToken(request.headers.get('authorization'));

  if (!expectedToken || requestToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RunReminderRequestBody;
    const supabase = await createAdminSupabase();
    const result = await runCarReminderJob(supabase, {
      carIds: body.carIds?.filter(Boolean),
      channel: assertReminderChannel(body.channel),
      force: Boolean(body.force),
      mode: assertReminderMode(body.mode),
      reminderTypes: assertReminderTypes(body.reminderTypes),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('run car reminders error==>', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '运行车辆提醒失败。',
      },
      { status: 500 },
    );
  }
}
