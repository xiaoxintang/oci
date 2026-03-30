const pad = (value: number) => String(value).padStart(2, '0');

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
