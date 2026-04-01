import { Database } from '@/types/database.types';

export type CarRow = Database['public']['Tables']['car']['Row'];
export type CarMileageLogRow = Database['public']['Tables']['car_mileage_log']['Row'];
export type CarInsurancePolicyRow =
  Database['public']['Tables']['car_insurance_policy']['Row'];
export type MaintenanceItemCatalogRow =
  Database['public']['Tables']['maintenance_item_catalog']['Row'];
export type CarMaintenanceConfigRow =
  Database['public']['Tables']['car_maintenance_config']['Row'];
export type CarMaintenanceServiceLogRow =
  Database['public']['Tables']['car_maintenance_service_log']['Row'];
export type CarReminderStateRow =
  Database['public']['Tables']['car_reminder_state']['Row'];
export type CarReminderDeliveryLogRow =
  Database['public']['Tables']['car_reminder_delivery_log']['Row'];
export type CarReminderViewRow =
  Database['public']['Views']['car_reminder_view']['Row'];

export type CarEnergyType = Database['public']['Enums']['car_energy_type'];
export type InsuranceType = Database['public']['Enums']['insurance_type'];
export type MaintenanceCategory =
  Database['public']['Enums']['maintenance_category'];
export type MaintenanceItemCode =
  Database['public']['Enums']['maintenance_item_code'];

export type CarFormValues = {
  buyAt: string;
  currentEngineKm: string;
  currentEvKm: string;
  energyType: CarEnergyType;
  name: string;
  note: string;
  plateNumber: string;
};

export type CarMileageFormValues = {
  engineKm: string;
  evKm: string;
  note: string;
  recordedAt: string;
};

export type InsuranceFormValues = {
  contactName: string;
  contactNote: string;
  contactPhone: string;
  effectiveEndAt: string;
  effectiveStartAt: string;
  insuranceType: InsuranceType;
  note: string;
  premiumAmount: string;
  purchasedAt: string;
  voucherKey: string;
  voucherUrl: string;
};

export type MaintenanceLogFormValues = {
  engineKm: string;
  evKm: string;
  itemCode: MaintenanceItemCode;
  note: string;
  performedAt: string;
};

export type MaintenanceConfigFormValues = {
  enabledOverride: 'default' | 'enabled' | 'disabled';
  intervalDaysOverride: string;
  intervalKmOverride: string;
  itemCode: MaintenanceItemCode;
  note: string;
};

export type ReminderRunMode = 'preview' | 'notify';
export type ReminderType = 'insurance' | 'maintenance';
export type ReminderChannel = 'dingtalk';

export const CAR_ENERGY_OPTIONS: CarEnergyType[] = ['fuel', 'electric', 'hybrid'];

export const INSURANCE_TYPE_OPTIONS: InsuranceType[] = [
  'compulsory',
  'commercial',
];

export const REMINDER_TYPE_OPTIONS: ReminderType[] = ['insurance', 'maintenance'];

export const REMINDER_CHANNEL_OPTIONS: ReminderChannel[] = ['dingtalk'];

export const CAR_ENERGY_LABELS: Record<CarEnergyType, string> = {
  fuel: '纯油',
  electric: '纯电',
  hybrid: '混动',
};

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  compulsory: '交强险',
  commercial: '商业险',
};

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  basic: '基础保养',
  engine: '发动机保养',
};

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  insurance: '保险',
  maintenance: '保养',
};

export const REMINDER_SEVERITY_LABELS: Record<string, string> = {
  expired: '已逾期',
  due_30d: '30 天内到期',
  due_30d_and_100km: '30 天内到期且 100 公里内',
  due_100km: '100 公里内到期',
};
