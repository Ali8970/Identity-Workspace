/** Remaining time, split into the units a countdown actually shows. */
export interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * A translation key plus its parameters, chosen by how much time is left.
 *
 * The key is picked here rather than in a template so the unit that leads the label — days,
 * hours or minutes — matches the magnitude. "1440 min" is technically correct and unreadable.
 */
export interface DurationLabel {
  key: string;
  params: RemainingTime;
}

/**
 * Splits the time left until `expiresAt` into days / hours / minutes.
 *
 * Returns `null` once it has elapsed, so callers hide the countdown rather than rendering a
 * zero or a negative. `now` is passed in so the caller owns the ticking and the result stays
 * a pure function of its inputs.
 */
export function remainingTime(
  expiresAt: string | null | undefined,
  now: number,
): RemainingTime | null {
  if (!expiresAt) {
    return null;
  }

  const remaining = Date.parse(expiresAt) - now;
  if (Number.isNaN(remaining) || remaining <= 0) {
    return null;
  }

  const totalMinutes = Math.ceil(remaining / 60_000);
  return {
    days: Math.floor(totalMinutes / 1_440),
    hours: Math.floor((totalMinutes % 1_440) / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * Picks the right copy for a remaining time under `keyPrefix`, which must provide
 * `.days`, `.hours` and `.minutes` variants.
 */
export function durationLabel(
  expiresAt: string | null | undefined,
  now: number,
  keyPrefix: string,
): DurationLabel | null {
  const left = remainingTime(expiresAt, now);
  if (left === null) {
    return null;
  }

  if (left.days > 0) {
    return { key: `${keyPrefix}.days`, params: left };
  }
  if (left.hours > 0) {
    return { key: `${keyPrefix}.hours`, params: left };
  }
  return { key: `${keyPrefix}.minutes`, params: left };
}
