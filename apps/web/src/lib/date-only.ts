export const PAST_DATE_MESSAGE = "Please choose today or a future date.";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

export function coerceDateOnlyValue(value: unknown) {
  if (typeof value === "string") {
    return parseLocalDateOnly(value) ?? value;
  }

  return value;
}

export function isPastDate(date: Date) {
  return startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime();
}

export function isTodayOrFutureDate(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  return !isPastDate(date);
}

export function isValidDateOnlyString(value: string) {
  return parseLocalDateOnly(value) !== undefined;
}

export function isTodayOrFutureDateString(value: string) {
  const parsed = parseLocalDateOnly(value);

  return parsed ? isTodayOrFutureDate(parsed) : false;
}
