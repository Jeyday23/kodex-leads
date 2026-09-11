// WS3 sequence caps: daily send cap and a send window in Europe/Berlin. Pure
// functions with an injected `now` so tests never depend on wall-clock time
// or the machine's local timezone.

export interface SendWindow {
  /** 0-23, inclusive start hour in Europe/Berlin local time. */
  startHour: number;
  /** 0-23, exclusive end hour in Europe/Berlin local time. */
  endHour: number;
  /** 0 (Sunday) - 6 (Saturday). Defaults to Monday-Friday when omitted. */
  daysOfWeek?: number[];
}

const DEFAULT_DAYS_OF_WEEK = [1, 2, 3, 4, 5];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Reads the hour and weekday of `now` as observed in Europe/Berlin, using
 * Intl.DateTimeFormat rather than manual UTC offset math so DST transitions
 * are handled correctly.
 */
function berlinParts(now: Date): { hour: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  // Intl can render midnight as "24" for hour12:false in some environments.
  const hour = Number(hourPart) % 24;
  const weekday = WEEKDAY_INDEX[weekdayPart] ?? 1;
  return { hour, weekday };
}

export function isWithinSendWindow(now: Date, window: SendWindow): boolean {
  const { hour, weekday } = berlinParts(now);
  const allowedDays = window.daysOfWeek ?? DEFAULT_DAYS_OF_WEEK;
  if (!allowedDays.includes(weekday)) return false;
  return hour >= window.startHour && hour < window.endHour;
}

export function isUnderDailyCap(sentToday: number, dailyCap: number): boolean {
  return sentToday < dailyCap;
}

export interface CapCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Combines the window and cap checks into one decision. Used by the sequence
 * engine before it ever creates a send-type task, and reusable by an admin
 * UI that wants to show why a send is currently blocked.
 */
export function canSendNow(now: Date, window: SendWindow, sentToday: number, dailyCap: number): CapCheckResult {
  if (!isWithinSendWindow(now, window)) {
    return { allowed: false, reason: "Outside the configured send window (Europe/Berlin)." };
  }
  if (!isUnderDailyCap(sentToday, dailyCap)) {
    return { allowed: false, reason: `Daily cap of ${dailyCap} reached.` };
  }
  return { allowed: true };
}
