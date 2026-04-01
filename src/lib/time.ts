const pad = (value: number) => String(value).padStart(2, '0');

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kilometerFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function toNumberValue(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function toLocalString(
  dateInput: string | number | Date | null | undefined,
) {
  if (!dateInput) {
    return '--';
  }

  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function toDateTimeLocalValue(
  dateInput: string | number | Date | null | undefined,
) {
  if (!dateInput) {
    return '';
  }

  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInputValue(
  dateInput: string | number | Date | null | undefined,
) {
  if (!dateInput) {
    return '';
  }

  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatCurrency(value: string | number | null | undefined) {
  return currencyFormatter.format(toNumberValue(value));
}

export function formatKilometers(value: string | number | null | undefined) {
  return `${kilometerFormatter.format(toNumberValue(value))} km`;
}
