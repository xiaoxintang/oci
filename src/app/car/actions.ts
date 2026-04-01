'use server';

import { revalidatePath } from 'next/cache';

import { formatCarSupabaseError } from '@/app/car/errors';
import {
  type CarEnergyType,
  type CarFormValues,
  type CarMileageFormValues,
  type InsuranceFormValues,
  INSURANCE_TYPE_OPTIONS,
  type MaintenanceConfigFormValues,
  type MaintenanceItemCode,
  type MaintenanceLogFormValues,
  CAR_ENERGY_OPTIONS,
} from '@/app/car/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { toNumberValue } from '@/lib/time';
import { Database } from '@/types/database.types';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>;
type CarInsert = Database['public']['Tables']['car']['Insert'];
type CarUpdate = Database['public']['Tables']['car']['Update'];
type CarMileageLogInsert =
  Database['public']['Tables']['car_mileage_log']['Insert'];
type CarInsurancePolicyInsert =
  Database['public']['Tables']['car_insurance_policy']['Insert'];
type CarInsurancePolicyUpdate =
  Database['public']['Tables']['car_insurance_policy']['Update'];
type CarMaintenanceServiceLogInsert =
  Database['public']['Tables']['car_maintenance_service_log']['Insert'];
type CarMaintenanceConfigInsert =
  Database['public']['Tables']['car_maintenance_config']['Insert'];

type CarSummary = Pick<
  Database['public']['Tables']['car']['Row'],
  | 'buy_at'
  | 'current_engine_km'
  | 'current_ev_km'
  | 'energy_type'
  | 'id'
  | 'name'
  | 'plate_number'
  | 'note'
  | 'user_id'
>;

type InsuranceSummary = Pick<
  Database['public']['Tables']['car_insurance_policy']['Row'],
  'car_id' | 'id'
>;

const cleanText = (value: string | null | undefined) => {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
};

function assertCarEnergyType(value: string): CarEnergyType {
  if (!CAR_ENERGY_OPTIONS.includes(value as CarEnergyType)) {
    throw new Error('车辆能源类型不合法。');
  }

  return value as CarEnergyType;
}

function assertInsuranceType(
  value: string,
): Database['public']['Enums']['insurance_type'] {
  if (
    !INSURANCE_TYPE_OPTIONS.includes(
      value as Database['public']['Enums']['insurance_type'],
    )
  ) {
    throw new Error('保险类型不合法。');
  }

  return value as Database['public']['Enums']['insurance_type'];
}

function assertMaintenanceItemCode(value: string): MaintenanceItemCode {
  const maintenanceItemCodes = [
    'tire_rotation',
    'brake_fluid',
    'engine_coolant',
    'battery_coolant',
    'transmission_gear_oil',
    'engine_oil_and_filter',
    'fuel_system_cleaner',
    'spark_plug',
    'fuel_filter',
    'air_filter_element',
  ] satisfies MaintenanceItemCode[];

  if (!maintenanceItemCodes.includes(value as MaintenanceItemCode)) {
    throw new Error('保养项目不合法。');
  }

  return value as MaintenanceItemCode;
}

async function requireAuthenticatedContext() {
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

async function requireOwnedCar(
  supabase: SupabaseClient,
  userId: string,
  carId: string,
) {
  const { data, error } = await supabase
    .from('car')
    .select(
      'id, user_id, name, energy_type, current_engine_km, current_ev_km, plate_number, buy_at, note',
    )
    .eq('id', carId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('未找到对应车辆。');
  }

  return data satisfies CarSummary;
}

async function requireOwnedInsurancePolicy(
  supabase: SupabaseClient,
  userId: string,
  policyId: string,
) {
  const { data, error } = await supabase
    .from('car_insurance_policy')
    .select('id, car_id')
    .eq('id', policyId)
    .single();

  if (error || !data) {
    throw new Error('未找到对应保险记录。');
  }

  await requireOwnedCar(supabase, userId, data.car_id);

  return data satisfies InsuranceSummary;
}

function parseNonNegativeKilometer(value: string, fieldLabel: string) {
  const nextValue = toNumberValue(value);

  if (nextValue < 0) {
    throw new Error(`${fieldLabel}不能小于 0。`);
  }

  return Number(nextValue.toFixed(1));
}

function parseCurrencyAmount(value: string, fieldLabel: string) {
  const nextValue = toNumberValue(value);

  if (nextValue < 0) {
    throw new Error(`${fieldLabel}不能小于 0。`);
  }

  return Number(nextValue.toFixed(2));
}

function assertMetricPair(
  energyType: CarEnergyType,
  engineKm: number,
  evKm: number,
) {
  if (engineKm < 0 || evKm < 0) {
    throw new Error('里程不能小于 0。');
  }

  if (energyType === 'fuel' && evKm !== 0) {
    throw new Error('纯油车的纯电里程必须为 0。');
  }

  if (energyType === 'electric' && engineKm !== 0) {
    throw new Error('纯电车的发动机里程必须为 0。');
  }
}

function requireDateValue(value: string, label: string) {
  const nextValue = value.trim();

  if (!nextValue) {
    throw new Error(`请填写${label}。`);
  }

  return nextValue;
}

function toIsoStartOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toIsoEndOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function toIsoDateTime(value: string, label: string) {
  const nextValue = value.trim();

  if (!nextValue) {
    throw new Error(`请填写${label}。`);
  }

  const date = new Date(nextValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}格式不正确。`);
  }

  return date.toISOString();
}

function getMaintenanceEnabledOverride(
  value: MaintenanceConfigFormValues['enabledOverride'],
) {
  if (value === 'enabled') {
    return true;
  }

  if (value === 'disabled') {
    return false;
  }

  return null;
}

async function revalidateCarPaths(carId: string) {
  revalidatePath('/car');
  revalidatePath(`/car/${carId}`);
}

function buildCarInsertValues(
  userId: string,
  values: CarFormValues,
): CarInsert {
  const energyType = assertCarEnergyType(values.energyType);
  const currentEngineKm = parseNonNegativeKilometer(
    values.currentEngineKm,
    '发动机里程',
  );
  const currentEvKm = parseNonNegativeKilometer(values.currentEvKm, '纯电里程');

  if (!cleanText(values.name)) {
    throw new Error('请填写车辆名称。');
  }

  assertMetricPair(energyType, currentEngineKm, currentEvKm);

  return {
    buy_at: cleanText(values.buyAt),
    current_engine_km: currentEngineKm,
    current_ev_km: currentEvKm,
    energy_type: energyType,
    name: values.name.trim(),
    note: cleanText(values.note),
    plate_number: cleanText(values.plateNumber),
    user_id: userId,
  };
}

export async function createCar(values: CarFormValues) {
  const { supabase, user } = await requireAuthenticatedContext();
  const insertValues = buildCarInsertValues(user.id, values);

  const { data, error } = await supabase
    .from('car')
    .insert(insertValues)
    .select('id, current_engine_km, current_ev_km')
    .single();

  if (error || !data) {
    throw new Error(formatCarSupabaseError(error, '创建车辆失败。'));
  }

  if (data.current_engine_km > 0 || data.current_ev_km > 0) {
    const mileageInsertValues: CarMileageLogInsert = {
      car_id: data.id,
      engine_km: data.current_engine_km,
      ev_km: data.current_ev_km,
      note: '建档初始里程',
      recorded_at: new Date().toISOString(),
    };

    const { error: mileageError } = await supabase
      .from('car_mileage_log')
      .insert(mileageInsertValues);

    if (mileageError) {
      throw new Error(formatCarSupabaseError(mileageError, '保存初始里程失败。'));
    }
  }

  await revalidateCarPaths(data.id);

  return {
    carId: data.id,
  };
}

export async function updateCarBasics(
  carId: string,
  values: Pick<CarFormValues, 'buyAt' | 'name' | 'note' | 'plateNumber'>,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  await requireOwnedCar(supabase, user.id, carId);

  if (!cleanText(values.name)) {
    throw new Error('请填写车辆名称。');
  }

  const updateValues: CarUpdate = {
    buy_at: cleanText(values.buyAt),
    name: values.name.trim(),
    note: cleanText(values.note),
    plate_number: cleanText(values.plateNumber),
  };

  const { error } = await supabase
    .from('car')
    .update(updateValues)
    .eq('id', carId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(formatCarSupabaseError(error, '更新车辆信息失败。'));
  }

  await revalidateCarPaths(carId);
}

export async function createCarMileageLog(
  carId: string,
  values: CarMileageFormValues,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  const car = await requireOwnedCar(supabase, user.id, carId);
  const engineKm = parseNonNegativeKilometer(values.engineKm, '发动机里程');
  const evKm = parseNonNegativeKilometer(values.evKm, '纯电里程');

  assertMetricPair(car.energy_type, engineKm, evKm);

  if (engineKm < car.current_engine_km || evKm < car.current_ev_km) {
    throw new Error('新的累计里程不能小于当前车辆里程。');
  }

  const insertValues: CarMileageLogInsert = {
    car_id: carId,
    engine_km: engineKm,
    ev_km: evKm,
    note: cleanText(values.note),
    recorded_at: toIsoDateTime(values.recordedAt, '记录时间'),
  };

  const { error } = await supabase.from('car_mileage_log').insert(insertValues);

  if (error) {
    throw new Error(formatCarSupabaseError(error, '保存里程记录失败。'));
  }

  await revalidateCarPaths(carId);
}

function buildInsuranceInsertValues(
  carId: string,
  values: InsuranceFormValues,
): CarInsurancePolicyInsert {
  const purchasedAt = requireDateValue(values.purchasedAt, '购买日期');
  const effectiveStartAt = requireDateValue(values.effectiveStartAt, '生效开始日期');
  const effectiveEndAt = requireDateValue(values.effectiveEndAt, '生效结束日期');

  if (effectiveEndAt < effectiveStartAt) {
    throw new Error('保险结束日期不能早于开始日期。');
  }

  return {
    car_id: carId,
    contact_name: cleanText(values.contactName),
    contact_note: cleanText(values.contactNote),
    contact_phone: cleanText(values.contactPhone),
    effective_end_at: toIsoEndOfDay(effectiveEndAt),
    effective_start_at: toIsoStartOfDay(effectiveStartAt),
    insurance_type: assertInsuranceType(values.insuranceType),
    note: cleanText(values.note),
    premium_amount: parseCurrencyAmount(values.premiumAmount, '保费'),
    purchased_at: purchasedAt,
    voucher_key: cleanText(values.voucherKey),
    voucher_url: cleanText(values.voucherUrl),
  };
}

export async function createCarInsurancePolicy(
  carId: string,
  values: InsuranceFormValues,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  await requireOwnedCar(supabase, user.id, carId);

  const { error } = await supabase
    .from('car_insurance_policy')
    .insert(buildInsuranceInsertValues(carId, values));

  if (error) {
    throw new Error(formatCarSupabaseError(error, '保存保险记录失败。'));
  }

  await revalidateCarPaths(carId);
}

export async function updateCarInsurancePolicy(
  policyId: string,
  values: InsuranceFormValues,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  const policy = await requireOwnedInsurancePolicy(supabase, user.id, policyId);
  const nextValues = buildInsuranceInsertValues(policy.car_id, values);

  const updateValues: CarInsurancePolicyUpdate = {
    ...nextValues,
  };

  const { error } = await supabase
    .from('car_insurance_policy')
    .update(updateValues)
    .eq('id', policyId);

  if (error) {
    throw new Error(formatCarSupabaseError(error, '更新保险记录失败。'));
  }

  await revalidateCarPaths(policy.car_id);
}

export async function createCarMaintenanceServiceLog(
  carId: string,
  values: MaintenanceLogFormValues,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  const car = await requireOwnedCar(supabase, user.id, carId);
  const engineKm = parseNonNegativeKilometer(values.engineKm, '发动机里程');
  const evKm = parseNonNegativeKilometer(values.evKm, '纯电里程');

  assertMetricPair(car.energy_type, engineKm, evKm);

  if (engineKm > car.current_engine_km || evKm > car.current_ev_km) {
    throw new Error('保养记录里的里程不能超过车辆当前里程。');
  }

  const itemCode = assertMaintenanceItemCode(values.itemCode);
  const note = cleanText(values.note);

  if (itemCode === 'transmission_gear_oil' && !note) {
    throw new Error('变速器齿轮油保养必须填写备注。');
  }

  const insertValues: CarMaintenanceServiceLogInsert = {
    car_id: carId,
    engine_km: engineKm,
    ev_km: evKm,
    item_code: itemCode,
    note,
    performed_at: toIsoStartOfDay(requireDateValue(values.performedAt, '保养日期')),
  };

  const { error } = await supabase
    .from('car_maintenance_service_log')
    .insert(insertValues);

  if (error) {
    throw new Error(formatCarSupabaseError(error, '保存保养记录失败。'));
  }

  await revalidateCarPaths(carId);
}

export async function upsertCarMaintenanceConfig(
  carId: string,
  values: MaintenanceConfigFormValues,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  await requireOwnedCar(supabase, user.id, carId);

  const insertValues: CarMaintenanceConfigInsert = {
    car_id: carId,
    enabled_override: getMaintenanceEnabledOverride(values.enabledOverride),
    interval_days_override: cleanText(values.intervalDaysOverride)
      ? Math.round(toNumberValue(values.intervalDaysOverride))
      : null,
    interval_km_override: cleanText(values.intervalKmOverride)
      ? Number(toNumberValue(values.intervalKmOverride).toFixed(1))
      : null,
    item_code: assertMaintenanceItemCode(values.itemCode),
    note: cleanText(values.note),
  };

  const { error } = await supabase.from('car_maintenance_config').upsert(
    insertValues,
    {
      onConflict: 'car_id,item_code',
    },
  );

  if (error) {
    throw new Error(formatCarSupabaseError(error, '保存保养周期配置失败。'));
  }

  await revalidateCarPaths(carId);
}

export async function acknowledgeCarReminder(
  carId: string,
  reminderKey: string,
) {
  const { supabase, user } = await requireAuthenticatedContext();
  await requireOwnedCar(supabase, user.id, carId);

  const { error } = await supabase.from('car_reminder_state').upsert(
    {
      acknowledged_at: new Date().toISOString(),
      car_id: carId,
      reminder_key: reminderKey,
      resolved_at: null,
      user_id: user.id,
    },
    {
      onConflict: 'reminder_key',
    },
  );

  if (error) {
    throw new Error(formatCarSupabaseError(error, '确认提醒失败。'));
  }

  await revalidateCarPaths(carId);
}
