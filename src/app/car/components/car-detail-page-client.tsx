'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { ArrowLeft, BellRing, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  acknowledgeCarReminder,
  createCarInsurancePolicy,
  createCarMaintenanceServiceLog,
  createCarMileageLog,
  updateCarBasics,
  updateCarInsurancePolicy,
  upsertCarMaintenanceConfig,
} from '@/app/car/actions';
import {
  CAR_ENERGY_LABELS,
  INSURANCE_TYPE_LABELS,
  type CarEnergyType,
  type CarInsurancePolicyRow,
  type CarMaintenanceConfigRow,
  type CarMaintenanceServiceLogRow,
  type CarMileageFormValues,
  type CarMileageLogRow,
  type CarRow,
  type InsuranceFormValues,
  type InsuranceType,
  type MaintenanceConfigFormValues,
  type MaintenanceItemCatalogRow,
  type MaintenanceLogFormValues,
} from '@/app/car/types';
import Upload from '@/components/upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  formatCurrency,
  formatKilometers,
  toDateInputValue,
  toDateTimeLocalValue,
  toLocalString,
} from '@/lib/time';

import { type CarReminderWithState } from '@/lib/car/reminders';
import { type CarReminderDeliveryLogRow } from '../types';

const selectClassName =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

function createInitialCarBasicForm(car: CarRow) {
  return {
    buyAt: toDateInputValue(car.buy_at),
    name: car.name,
    note: car.note ?? '',
    plateNumber: car.plate_number ?? '',
  };
}

function createInitialMileageForm(car: CarRow): CarMileageFormValues {
  return {
    engineKm: String(car.current_engine_km),
    evKm: String(car.current_ev_km),
    note: '',
    recordedAt: toDateTimeLocalValue(new Date()),
  };
}

function createInsuranceFormValues(
  insuranceType: InsuranceType,
  options?: {
    sourcePolicy?: CarInsurancePolicyRow;
  },
): InsuranceFormValues {
  const today = toDateInputValue(new Date());
  const sourcePolicy = options?.sourcePolicy;

  return {
    contactName: sourcePolicy?.contact_name ?? '',
    contactNote: sourcePolicy?.contact_note ?? '',
    contactPhone: sourcePolicy?.contact_phone ?? '',
    effectiveEndAt: today,
    effectiveStartAt: today,
    insuranceType,
    note: '',
    premiumAmount:
      typeof sourcePolicy?.premium_amount === 'number'
        ? String(sourcePolicy.premium_amount)
        : '',
    purchasedAt: today,
    voucherKey: '',
    voucherUrl: '',
  };
}

function getInsuranceStatusMeta(policy: CarInsurancePolicyRow | null) {
  if (!policy) {
    return {
      className: 'bg-destructive/10 text-destructive',
      description: '当前未录入保单',
      label: '未配置',
    };
  }

  const endAt = new Date(policy.effective_end_at);
  const now = new Date();
  const warningDate = new Date(endAt);
  warningDate.setDate(warningDate.getDate() - 30);

  if (endAt < now) {
    return {
      className: 'bg-destructive/10 text-destructive',
      description: '已经过期，请尽快补录续保信息',
      label: '已过期',
    };
  }

  if (warningDate <= now) {
    return {
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      description: '30 天内到期，建议提前处理续保',
      label: '即将到期',
    };
  }

  return {
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    description: '当前保单处于有效期内',
    label: '保障中',
  };
}

function getInsuranceTypeDescription(insuranceType: InsuranceType) {
  return insuranceType === 'compulsory'
    ? '交强险为必备险种，建议始终保持有效状态。'
    : '商业险通常会一起购买，但允许当前暂未投保。';
}

function createInitialMaintenanceForm(
  car: CarRow,
  catalog: MaintenanceItemCatalogRow[],
): MaintenanceLogFormValues {
  return {
    engineKm: String(car.current_engine_km),
    evKm: String(car.current_ev_km),
    itemCode: catalog[0]?.code ?? 'tire_rotation',
    note: '',
    performedAt: toDateInputValue(new Date()),
  };
}

function buildMaintenanceConfigFormValues(
  itemCode: MaintenanceItemCatalogRow['code'],
  catalogMap: Map<MaintenanceItemCatalogRow['code'], MaintenanceItemCatalogRow>,
  configMap: Map<MaintenanceItemCatalogRow['code'], CarMaintenanceConfigRow>,
): MaintenanceConfigFormValues {
  const catalog = catalogMap.get(itemCode);
  const config = configMap.get(itemCode);

  return {
    enabledOverride:
      config?.enabled_override === null || config?.enabled_override === undefined
        ? 'default'
        : config.enabled_override
          ? 'enabled'
          : 'disabled',
    intervalDaysOverride:
      config?.interval_days_override !== null &&
      config?.interval_days_override !== undefined
        ? String(config.interval_days_override)
        : catalog
          ? String(catalog.default_interval_days)
          : '',
    intervalKmOverride:
      config?.interval_km_override !== null &&
      config?.interval_km_override !== undefined
        ? String(config.interval_km_override)
        : catalog
          ? String(catalog.default_interval_km)
          : '',
    itemCode,
    note: config?.note ?? '',
  };
}

function isCatalogItemApplicable(
  item: MaintenanceItemCatalogRow,
  energyType: CarEnergyType,
) {
  if (energyType === 'fuel') {
    return item.enabled_for_fuel;
  }

  if (energyType === 'electric') {
    return item.enabled_for_electric;
  }

  return item.enabled_for_hybrid;
}

type CarDetailPageClientProps = {
  car: CarRow;
  deliveryLogs: CarReminderDeliveryLogRow[];
  insurancePolicies: CarInsurancePolicyRow[];
  maintenanceCatalog: MaintenanceItemCatalogRow[];
  maintenanceConfigs: CarMaintenanceConfigRow[];
  maintenanceLogs: CarMaintenanceServiceLogRow[];
  mileageLogs: CarMileageLogRow[];
  reminders: CarReminderWithState[];
};

export default function CarDetailPageClient({
  car,
  deliveryLogs,
  insurancePolicies,
  maintenanceCatalog,
  maintenanceConfigs,
  maintenanceLogs,
  mileageLogs,
  reminders,
}: CarDetailPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const applicableCatalog = useMemo(
    () =>
      maintenanceCatalog.filter((item) =>
        isCatalogItemApplicable(item, car.energy_type),
      ),
    [car.energy_type, maintenanceCatalog],
  );

  const configMap = useMemo(
    () =>
      new Map(
        maintenanceConfigs.map((item) => [item.item_code, item] as const),
      ),
    [maintenanceConfigs],
  );
  const catalogMap = useMemo(
    () =>
      new Map(
        applicableCatalog.map((item) => [item.code, item] as const),
      ),
    [applicableCatalog],
  );
  const [carBasicForm, setCarBasicForm] = useState(() =>
    createInitialCarBasicForm(car),
  );
  const [mileageForm, setMileageForm] = useState(() => createInitialMileageForm(car));
  const [insuranceForm, setInsuranceForm] = useState(() =>
    createInsuranceFormValues('compulsory'),
  );
  const [maintenanceForm, setMaintenanceForm] = useState(() =>
    createInitialMaintenanceForm(car, applicableCatalog),
  );
  const [maintenanceConfigForm, setMaintenanceConfigForm] = useState(() =>
    buildMaintenanceConfigFormValues(
      applicableCatalog[0]?.code ?? 'tire_rotation',
      catalogMap,
      configMap,
    ),
  );
  const [editingInsuranceId, setEditingInsuranceId] = useState<string | null>(null);
  const latestCompulsoryInsurance =
    insurancePolicies.find((item) => item.insurance_type === 'compulsory') ?? null;
  const latestCommercialInsurance =
    insurancePolicies.find((item) => item.insurance_type === 'commercial') ?? null;
  const activeInsuranceType = insuranceForm.insuranceType;
  const activeInsurancePolicy =
    activeInsuranceType === 'compulsory'
      ? latestCompulsoryInsurance
      : latestCommercialInsurance;
  const activeInsuranceStatusMeta = getInsuranceStatusMeta(activeInsurancePolicy);

  const onRefresh = () => {
    router.refresh();
  };

  const runAction = (runner: () => Promise<void>, successMessage: string) => {
    startTransition(() => {
      void (async () => {
        try {
          await runner();
          toast.success(successMessage);
          onRefresh();
        } catch (error) {
          console.error('car detail action error==>', error);
          toast.error(
            error instanceof Error ? error.message : '操作失败，请稍后再试。',
          );
        }
      })();
    });
  };

  const onSaveCarBasics = () => {
    runAction(
      () => updateCarBasics(car.id, carBasicForm),
      '车辆信息已更新。',
    );
  };

  const onCreateMileageLog = () => {
    runAction(
      async () => {
        await createCarMileageLog(car.id, mileageForm);
        setMileageForm(createInitialMileageForm(car));
      },
      '里程记录已保存。',
    );
  };

  const onSubmitInsurance = () => {
    runAction(
      async () => {
        if (editingInsuranceId) {
          await updateCarInsurancePolicy(editingInsuranceId, insuranceForm);
        } else {
          await createCarInsurancePolicy(car.id, insuranceForm);
        }

        setEditingInsuranceId(null);
        setInsuranceForm(createInsuranceFormValues(activeInsuranceType));
      },
      editingInsuranceId ? '保险记录已更新。' : '保险记录已保存。',
    );
  };

  const onSubmitMaintenance = () => {
    runAction(
      async () => {
        await createCarMaintenanceServiceLog(car.id, maintenanceForm);
        setMaintenanceForm(createInitialMaintenanceForm(car, applicableCatalog));
      },
      '保养记录已保存。',
    );
  };

  const onSubmitMaintenanceConfig = () => {
    runAction(
      async () => {
        await upsertCarMaintenanceConfig(car.id, maintenanceConfigForm);
        const nextConfigMap = new Map(configMap);

        nextConfigMap.set(maintenanceConfigForm.itemCode, {
          car_id: car.id,
          created_at: '',
          enabled_override:
            maintenanceConfigForm.enabledOverride === 'default'
              ? null
              : maintenanceConfigForm.enabledOverride === 'enabled',
          id: '',
          interval_days_override: maintenanceConfigForm.intervalDaysOverride
            ? Number(maintenanceConfigForm.intervalDaysOverride)
            : null,
          interval_km_override: maintenanceConfigForm.intervalKmOverride
            ? Number(maintenanceConfigForm.intervalKmOverride)
            : null,
          item_code: maintenanceConfigForm.itemCode,
          note: maintenanceConfigForm.note || null,
          updated_at: '',
        });
        setMaintenanceConfigForm(
          buildMaintenanceConfigFormValues(
            maintenanceConfigForm.itemCode,
            catalogMap,
            nextConfigMap,
          ),
        );
      },
      '保养周期配置已保存。',
    );
  };

  const onAcknowledgeReminder = (reminderKey: string) => {
    runAction(
      () => acknowledgeCarReminder(car.id, reminderKey),
      '提醒已确认。',
    );
  };

  const onEditInsurance = (policy: CarInsurancePolicyRow) => {
    setEditingInsuranceId(policy.id);
    setInsuranceForm({
      contactName: policy.contact_name ?? '',
      contactNote: policy.contact_note ?? '',
      contactPhone: policy.contact_phone ?? '',
      effectiveEndAt: toDateInputValue(policy.effective_end_at),
      effectiveStartAt: toDateInputValue(policy.effective_start_at),
      insuranceType: policy.insurance_type,
      note: policy.note ?? '',
      premiumAmount: String(policy.premium_amount),
      purchasedAt: toDateInputValue(policy.purchased_at),
      voucherKey: policy.voucher_key ?? '',
      voucherUrl: policy.voucher_url ?? '',
    });
  };

  const onStartCreateInsurance = (
    insuranceType: InsuranceType,
    options?: {
      sourcePolicy?: CarInsurancePolicyRow;
    },
  ) => {
    setEditingInsuranceId(null);
    setInsuranceForm(createInsuranceFormValues(insuranceType, options));
  };

  const onEditMaintenanceConfig = (config: CarMaintenanceConfigRow) => {
    setMaintenanceConfigForm(
      buildMaintenanceConfigFormValues(config.item_code, catalogMap, configMap),
    );
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/car">
              <ArrowLeft className="size-4" />
              返回车辆列表
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{car.name}</h1>
          <p className="text-sm text-muted-foreground">
            {CAR_ENERGY_LABELS[car.energy_type]}
            {car.plate_number ? ` · ${car.plate_number}` : ' · 未设置车牌'}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">发动机里程</CardTitle>
            <p className="text-2xl font-semibold">
              {formatKilometers(car.current_engine_km)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">纯电里程</CardTitle>
            <p className="text-2xl font-semibold">
              {formatKilometers(car.current_ev_km)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">总里程</CardTitle>
            <p className="text-2xl font-semibold">
              {formatKilometers(car.current_total_km)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-4 text-muted-foreground" />
              当前提醒
            </CardTitle>
            <p className="text-2xl font-semibold">
              {reminders.filter((item) => !item.resolved_at).length}
            </p>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>车辆信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="detail-car-name" className="text-sm font-medium">
                  车辆名称
                </label>
                <Input
                  id="detail-car-name"
                  value={carBasicForm.name}
                  onChange={(event) =>
                    setCarBasicForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="detail-car-plate-number"
                  className="text-sm font-medium"
                >
                  车牌号
                </label>
                <Input
                  id="detail-car-plate-number"
                  value={carBasicForm.plateNumber}
                  onChange={(event) =>
                    setCarBasicForm((current) => ({
                      ...current,
                      plateNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="detail-car-energy" className="text-sm font-medium">
                  能源类型
                </label>
                <Input
                  id="detail-car-energy"
                  value={CAR_ENERGY_LABELS[car.energy_type]}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="detail-car-buy-at" className="text-sm font-medium">
                  购车日期
                </label>
                <Input
                  id="detail-car-buy-at"
                  type="date"
                  value={carBasicForm.buyAt}
                  onChange={(event) =>
                    setCarBasicForm((current) => ({
                      ...current,
                      buyAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="detail-car-note" className="text-sm font-medium">
                备注
              </label>
              <Textarea
                id="detail-car-note"
                value={carBasicForm.note}
                onChange={(event) =>
                  setCarBasicForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={onSaveCarBasics} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                保存车辆信息
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>录入里程</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="detail-mileage-engine" className="text-sm font-medium">
                  发动机里程
                </label>
                <Input
                  id="detail-mileage-engine"
                  type="number"
                  min="0"
                  step="0.1"
                  value={mileageForm.engineKm}
                  onChange={(event) =>
                    setMileageForm((current) => ({
                      ...current,
                      engineKm: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="detail-mileage-ev" className="text-sm font-medium">
                  纯电里程
                </label>
                <Input
                  id="detail-mileage-ev"
                  type="number"
                  min="0"
                  step="0.1"
                  value={mileageForm.evKm}
                  onChange={(event) =>
                    setMileageForm((current) => ({
                      ...current,
                      evKm: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="detail-mileage-recorded-at" className="text-sm font-medium">
                记录时间
              </label>
              <Input
                id="detail-mileage-recorded-at"
                type="datetime-local"
                value={mileageForm.recordedAt}
                onChange={(event) =>
                  setMileageForm((current) => ({
                    ...current,
                    recordedAt: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="detail-mileage-note" className="text-sm font-medium">
                备注
              </label>
              <Textarea
                id="detail-mileage-note"
                value={mileageForm.note}
                onChange={(event) =>
                  setMileageForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={onCreateMileageLog} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                保存里程记录
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>保险记录</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 xl:grid-cols-2">
              {([
                {
                  helperText: '必须配置',
                  insuranceType: 'compulsory',
                  policy: latestCompulsoryInsurance,
                },
                {
                  helperText: '通常会一起购买',
                  insuranceType: 'commercial',
                  policy: latestCommercialInsurance,
                },
              ] as const).map(({ insuranceType, policy, helperText }) => {
                const statusMeta = getInsuranceStatusMeta(policy);

                return (
                  <div
                    key={insuranceType}
                    className={`rounded-2xl border p-4 ${
                      insuranceType === 'compulsory' && !policy
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {INSURANCE_TYPE_LABELS[insuranceType]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {helperText}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          {statusMeta.description}
                        </p>
                        <p>
                          保费：
                          <span className="font-medium text-foreground">
                            {policy ? formatCurrency(policy.premium_amount) : '--'}
                          </span>
                        </p>
                        <p>
                          生效区间：
                          <span className="font-medium text-foreground">
                            {policy
                              ? `${toDateInputValue(policy.effective_start_at)} ~ ${toDateInputValue(
                                  policy.effective_end_at,
                                )}`
                              : '--'}
                          </span>
                        </p>
                        <p>
                          联系人：
                          <span className="font-medium text-foreground">
                            {policy?.contact_name || '未填写'}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {policy ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditInsurance(policy)}
                            >
                              编辑当前记录
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onStartCreateInsurance(insuranceType, {
                                  sourcePolicy: policy,
                                })
                              }
                            >
                              录入续保
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onStartCreateInsurance(insuranceType)}
                          >
                            {insuranceType === 'compulsory'
                              ? '立即补录交强险'
                              : '录入商业险'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {editingInsuranceId
                      ? `编辑${INSURANCE_TYPE_LABELS[activeInsuranceType]}`
                      : `录入${INSURANCE_TYPE_LABELS[activeInsuranceType]}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getInsuranceTypeDescription(activeInsuranceType)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${activeInsuranceStatusMeta.className}`}
                  >
                    {INSURANCE_TYPE_LABELS[activeInsuranceType]}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label
                      htmlFor="insurance-type-readonly"
                      className="text-sm font-medium"
                    >
                      当前险种
                    </label>
                    <Input
                      id="insurance-type-readonly"
                      value={INSURANCE_TYPE_LABELS[insuranceForm.insuranceType]}
                      disabled
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="insurance-premium" className="text-sm font-medium">
                      保费
                    </label>
                    <Input
                      id="insurance-premium"
                      type="number"
                      min="0"
                      step="0.01"
                      value={insuranceForm.premiumAmount}
                      onChange={(event) =>
                        setInsuranceForm((current) => ({
                          ...current,
                          premiumAmount: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label htmlFor="insurance-purchased-at" className="text-sm font-medium">
                      购买日期
                    </label>
                    <Input
                      id="insurance-purchased-at"
                      type="date"
                      value={insuranceForm.purchasedAt}
                      onChange={(event) =>
                        setInsuranceForm((current) => ({
                          ...current,
                          purchasedAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="insurance-start-at" className="text-sm font-medium">
                      生效开始
                    </label>
                    <Input
                      id="insurance-start-at"
                      type="date"
                      value={insuranceForm.effectiveStartAt}
                      onChange={(event) =>
                        setInsuranceForm((current) => ({
                          ...current,
                          effectiveStartAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="insurance-end-at" className="text-sm font-medium">
                      生效结束
                    </label>
                    <Input
                      id="insurance-end-at"
                      type="date"
                      value={insuranceForm.effectiveEndAt}
                      onChange={(event) =>
                        setInsuranceForm((current) => ({
                          ...current,
                          effectiveEndAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">保险凭证</label>
                    <Upload
                      initialUrl={insuranceForm.voucherUrl || undefined}
                      prefix="car/insurance"
                      onChange={(result) =>
                        setInsuranceForm((current) => ({
                          ...current,
                          voucherKey: result.key ?? '',
                          voucherUrl: result.url,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label htmlFor="insurance-contact-name" className="text-sm font-medium">
                          联系人
                        </label>
                        <Input
                          id="insurance-contact-name"
                          value={insuranceForm.contactName}
                          onChange={(event) =>
                            setInsuranceForm((current) => ({
                              ...current,
                              contactName: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="insurance-contact-phone" className="text-sm font-medium">
                          联系电话
                        </label>
                        <Input
                          id="insurance-contact-phone"
                          value={insuranceForm.contactPhone}
                          onChange={(event) =>
                            setInsuranceForm((current) => ({
                              ...current,
                              contactPhone: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="insurance-contact-note" className="text-sm font-medium">
                        联系人备注
                      </label>
                      <Textarea
                        id="insurance-contact-note"
                        value={insuranceForm.contactNote}
                        onChange={(event) =>
                          setInsuranceForm((current) => ({
                            ...current,
                            contactNote: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="insurance-note" className="text-sm font-medium">
                    备注
                  </label>
                  <Textarea
                    id="insurance-note"
                    value={insuranceForm.note}
                    onChange={(event) =>
                      setInsuranceForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingInsuranceId(null);
                      setInsuranceForm(
                        createInsuranceFormValues(activeInsuranceType, {
                          sourcePolicy: activeInsurancePolicy ?? undefined,
                        }),
                      );
                    }}
                  >
                    重置表单
                  </Button>
                  <Button onClick={onSubmitInsurance} disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {editingInsuranceId ? '更新保险记录' : '保存保险记录'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">保险历史</p>
                <p className="text-xs text-muted-foreground">
                  交强险应始终至少保留一条有效记录，商业险可按需补录
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>保险类型</TableHead>
                    <TableHead>购买日期</TableHead>
                    <TableHead>生效区间</TableHead>
                    <TableHead>保费</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insurancePolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{INSURANCE_TYPE_LABELS[policy.insurance_type]}</TableCell>
                      <TableCell>{policy.purchased_at}</TableCell>
                      <TableCell>
                        {toDateInputValue(policy.effective_start_at)} ~{' '}
                        {toDateInputValue(policy.effective_end_at)}
                      </TableCell>
                      <TableCell>{formatCurrency(policy.premium_amount)}</TableCell>
                      <TableCell>{policy.contact_name || '--'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditInsurance(policy)}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>保养记录与周期</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="maintenance-item" className="text-sm font-medium">
                  保养项目
                </label>
                <select
                  id="maintenance-item"
                  className={selectClassName}
                  value={maintenanceForm.itemCode}
                  onChange={(event) =>
                    setMaintenanceForm((current) => ({
                      ...current,
                      itemCode:
                        event.target.value as MaintenanceLogFormValues['itemCode'],
                    }))
                  }
                >
                  {applicableCatalog.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <label htmlFor="maintenance-date" className="text-sm font-medium">
                    保养日期
                  </label>
                  <Input
                    id="maintenance-date"
                    type="date"
                    value={maintenanceForm.performedAt}
                    onChange={(event) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        performedAt: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="maintenance-engine-km" className="text-sm font-medium">
                    发动机里程
                  </label>
                  <Input
                    id="maintenance-engine-km"
                    type="number"
                    min="0"
                    step="0.1"
                    value={maintenanceForm.engineKm}
                    onChange={(event) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        engineKm: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="maintenance-ev-km" className="text-sm font-medium">
                    纯电里程
                  </label>
                  <Input
                    id="maintenance-ev-km"
                    type="number"
                    min="0"
                    step="0.1"
                    value={maintenanceForm.evKm}
                    onChange={(event) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        evKm: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="maintenance-note" className="text-sm font-medium">
                  备注
                </label>
                <Textarea
                  id="maintenance-note"
                  value={maintenanceForm.note}
                  onChange={(event) =>
                    setMaintenanceForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={onSubmitMaintenance} disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  保存保养记录
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-medium">保养周期覆盖</p>
                <p className="text-sm text-muted-foreground">
                  系统默认周期可按车辆和项目单独覆盖。
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="maintenance-config-item" className="text-sm font-medium">
                    保养项目
                  </label>
                    <select
                      id="maintenance-config-item"
                      className={selectClassName}
                      value={maintenanceConfigForm.itemCode}
                      onChange={(event) =>
                        setMaintenanceConfigForm(
                          buildMaintenanceConfigFormValues(
                            event.target.value as MaintenanceConfigFormValues['itemCode'],
                            catalogMap,
                            configMap,
                          ),
                        )
                      }
                    >
                    {applicableCatalog.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label htmlFor="maintenance-config-enabled" className="text-sm font-medium">
                      是否启用覆盖
                    </label>
                    <select
                      id="maintenance-config-enabled"
                      className={selectClassName}
                      value={maintenanceConfigForm.enabledOverride}
                      onChange={(event) =>
                        setMaintenanceConfigForm((current) => ({
                          ...current,
                          enabledOverride:
                            event.target.value as MaintenanceConfigFormValues['enabledOverride'],
                        }))
                      }
                    >
                      <option value="default">跟随系统默认</option>
                      <option value="enabled">强制启用</option>
                      <option value="disabled">强制禁用</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="maintenance-config-km" className="text-sm font-medium">
                      里程周期覆盖
                    </label>
                    <Input
                      id="maintenance-config-km"
                      type="number"
                      min="0"
                      step="0.1"
                      value={maintenanceConfigForm.intervalKmOverride}
                      onChange={(event) =>
                        setMaintenanceConfigForm((current) => ({
                          ...current,
                          intervalKmOverride: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="maintenance-config-days" className="text-sm font-medium">
                      时间周期覆盖
                    </label>
                    <Input
                      id="maintenance-config-days"
                      type="number"
                      min="0"
                      step="1"
                      value={maintenanceConfigForm.intervalDaysOverride}
                      onChange={(event) =>
                        setMaintenanceConfigForm((current) => ({
                          ...current,
                          intervalDaysOverride: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="maintenance-config-note" className="text-sm font-medium">
                    配置备注
                  </label>
                  <Textarea
                    id="maintenance-config-note"
                    value={maintenanceConfigForm.note}
                    onChange={(event) =>
                      setMaintenanceConfigForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={onSubmitMaintenanceConfig} disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    保存周期配置
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>当前提醒</CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length ? (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.reminder_key}
                    className="flex flex-col gap-3 rounded-2xl border px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.severity}
                        {reminder.due_at ? ` · ${reminder.due_at.slice(0, 10)}` : ''}
                        {typeof reminder.due_km === 'number'
                          ? ` · ${formatKilometers(reminder.due_km)}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {reminder.acknowledged_at ? (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          已确认
                        </span>
                      ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAcknowledgeReminder(reminder.reminder_key)}
                          disabled={isPending || Boolean(reminder.acknowledged_at)}
                        >
                        确认提醒
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                当前没有需要处理的提醒。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>历史记录</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-medium">里程历史</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>记录时间</TableHead>
                    <TableHead>发动机里程</TableHead>
                    <TableHead>纯电里程</TableHead>
                    <TableHead>总里程</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mileageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{toLocalString(log.recorded_at)}</TableCell>
                      <TableCell>{formatKilometers(log.engine_km)}</TableCell>
                      <TableCell>{formatKilometers(log.ev_km)}</TableCell>
                      <TableCell>{formatKilometers(log.total_km)}</TableCell>
                      <TableCell>{log.note || '--'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">保险历史</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>保险类型</TableHead>
                    <TableHead>购买日期</TableHead>
                    <TableHead>生效区间</TableHead>
                    <TableHead>保费</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insurancePolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{INSURANCE_TYPE_LABELS[policy.insurance_type]}</TableCell>
                      <TableCell>{policy.purchased_at}</TableCell>
                      <TableCell>
                        {toDateInputValue(policy.effective_start_at)} ~{' '}
                        {toDateInputValue(policy.effective_end_at)}
                      </TableCell>
                      <TableCell>{formatCurrency(policy.premium_amount)}</TableCell>
                      <TableCell>{policy.contact_name || '--'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditInsurance(policy)}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">保养历史</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>发动机里程</TableHead>
                    <TableHead>纯电里程</TableHead>
                    <TableHead>总里程</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {maintenanceCatalog.find((item) => item.code === log.item_code)?.label ??
                          log.item_code}
                      </TableCell>
                      <TableCell>{toDateInputValue(log.performed_at)}</TableCell>
                      <TableCell>{formatKilometers(log.engine_km)}</TableCell>
                      <TableCell>{formatKilometers(log.ev_km)}</TableCell>
                      <TableCell>{formatKilometers(log.total_km)}</TableCell>
                      <TableCell>{log.note || '--'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">保养周期配置</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    <TableHead>启用覆盖</TableHead>
                    <TableHead>里程周期</TableHead>
                    <TableHead>时间周期</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicableCatalog.map((item) => {
                    const config = configMap.get(item.code);

                    return (
                      <TableRow key={item.code}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>
                          {config?.enabled_override === null || config?.enabled_override === undefined
                            ? '跟随默认'
                            : config.enabled_override
                              ? '强制启用'
                              : '强制禁用'}
                        </TableCell>
                        <TableCell>
                          {config?.interval_km_override
                            ? formatKilometers(config.interval_km_override)
                            : formatKilometers(item.default_interval_km)}
                        </TableCell>
                        <TableCell>
                          {config?.interval_days_override ?? item.default_interval_days} 天
                        </TableCell>
                        <TableCell>{config?.note || '--'}</TableCell>
                        <TableCell className="text-right">
                          {config ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditMaintenanceConfig(config)}
                            >
                              编辑
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">未覆盖</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">提醒发送日志</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>发送时间</TableHead>
                    <TableHead>渠道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>提醒键</TableHead>
                    <TableHead>返回摘要</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{toLocalString(log.sent_at)}</TableCell>
                      <TableCell>{log.channel}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {log.reminder_key}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {log.response_excerpt || '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
