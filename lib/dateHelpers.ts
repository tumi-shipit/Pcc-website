export const SOUTH_AFRICA_TIME_ZONE = "Africa/Johannesburg";

export function parseCalendarDate(value: string | null | undefined) {
  if (!value) return null;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;

    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getSouthAfricaDateParts(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function getSouthAfricaDateKey(value: Date = new Date()) {
  const { year, month, day } = getSouthAfricaDateParts(value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

export function getCalendarDateKey(value: string | null | undefined) {
  if (!value) return null;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return value.slice(0, 10);

  const parsed = parseCalendarDate(value);
  if (!parsed) return null;

  return getSouthAfricaDateKey(parsed);
}

export function getCalendarYear(value: string | null | undefined) {
  if (!value) return null;

  const dateOnly = value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (dateOnly) return Number(dateOnly[1]);

  const parsed = parseCalendarDate(value);
  if (!parsed) return null;

  const { year } = getSouthAfricaDateParts(parsed);
  return Number.isFinite(year) ? year : null;
}

export function formatCalendarDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
) {
  const parsed = parseCalendarDate(value);

  if (!parsed) return "TBA";

  return parsed.toLocaleDateString("en-ZA", {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    ...options,
  });
}

export function formatSouthAfricaDateTime(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
) {
  const parsed = parseCalendarDate(value);

  if (!parsed) return "TBA";

  return parsed.toLocaleString("en-ZA", {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    ...options,
  });
}
