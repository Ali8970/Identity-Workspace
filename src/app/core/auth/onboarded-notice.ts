import { Service } from '@angular/core';

const STORAGE_KEY = 'brooch.onboarding.justCompleted';

/** The toast the notice turns into on the first page the owner reaches after paying. */
export const PAYMENT_SUCCEEDED_TOAST = {
  tone: 'success',
  titleKey: 'onboarding.successToast.title',
  messageKey: 'onboarding.successToast.body',
} as const;

/** Long enough to survive the sign-out and the trip to `/login`, short enough to never go stale. */
const NOTICE_TTL_MS = 10 * 60_000;

/**
 * Carries "your purchase just completed" past the end of the session that paid.
 *
 * Completion re-provisions the owner's roles, so that session ends — through the planned
 * hand-off, through a 401 the error pipeline turns into a sign-out, or both, and the hand-off
 * may finish with a full page load. A one-shot read would be spent by whichever page came
 * first and lost to the reload; instead the notice stays pending until the toast it raised has
 * actually been seen out, and only then is cleared.
 *
 * Only a timestamp is stored — no token, no amount, no ids.
 */
@Service()
export class OnboardedNotice {
  remember(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Blocked storage only costs the toast on an unplanned sign-out; the URL flag still works.
    }
  }

  /** True while a completed purchase is waiting to be celebrated. Reading does not clear it. */
  pending(): boolean {
    try {
      const stored = Number(sessionStorage.getItem(STORAGE_KEY));
      return Number.isFinite(stored) && stored > 0 && Date.now() - stored < NOTICE_TTL_MS;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear when storage is unavailable.
    }
  }
}
