import { BadRequestException } from '@nestjs/common';
import { timezoneFor } from '../tenancy/country-time';

export interface StatementPeriod {
  /** Inclusive local start date, YYYY-MM-DD. */
  from: string;
  /** Inclusive local end date, YYYY-MM-DD. */
  to: string;
  timezone: string;
  /** UTC instant of local midnight at the start of `from`. */
  start: Date;
  /** UTC instant of local midnight after `to` (exclusive). */
  end: Date;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffsetMs(instant: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(instant).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight on `date` in `timezone` (DST-safe). */
export function localMidnight(date: string, timezone: string) {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - zoneOffsetMs(new Date(guess), timezone);
  return new Date(guess - zoneOffsetMs(new Date(first), timezone));
}

export function localToday(timezone: string, now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function nextDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Parses an optional from/to pair in the actor's country time; defaults to the year to date. */
export function resolvePeriod(input: { from?: string; to?: string }, countryNodeId: string | undefined, now = new Date()): StatementPeriod {
  const timezone = timezoneFor(countryNodeId);
  const today = localToday(timezone, now);
  const to = input.to || today;
  const from = input.from || `${to.slice(0, 4)}-01-01`;
  for (const value of [from, to]) {
    if (!DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new BadRequestException(`Invalid date "${value}". Use YYYY-MM-DD.`);
  }
  if (from > to) throw new BadRequestException('The statement start date must not be after the end date.');
  if (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 5 * 366 * 86_400_000) throw new BadRequestException('A statement can cover at most five years.');
  return { from, to, timezone, start: localMidnight(from, timezone), end: localMidnight(nextDay(to), timezone) };
}
