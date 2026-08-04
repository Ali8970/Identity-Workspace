import { Service, computed, signal } from '@angular/core';

/** Requests faster than this never paint the bar — a 60ms flash reads as a glitch. */
const APPEAR_DELAY_MS = 140;
/** Once painted the bar stays at least this long, so it is never a blink. */
const MIN_VISIBLE_MS = 420;

/**
 * Counts in-flight API calls for the global loading bar.
 *
 * The counter is exact; `active` is the debounced view of it, so a burst of
 * back-to-back requests shows one continuous bar instead of a stutter.
 */
@Service()
export class HttpActivityService {
  private readonly inFlight = signal(0);
  private readonly visible = signal(false);

  private appearTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  /** At least one tracked request is in flight, undebounced. */
  readonly busy = computed(() => this.inFlight() > 0);

  /** Debounced flag the global loading bar renders from. */
  readonly active = this.visible.asReadonly();

  begin(): void {
    this.inFlight.update((count) => count + 1);
    if (this.inFlight() !== 1) {
      return;
    }

    // A follow-up request arrived inside the min-visible window: keep the bar up.
    this.cancelHide();
    if (this.visible() || this.appearTimer !== null) {
      return;
    }

    this.appearTimer = setTimeout(() => {
      this.appearTimer = null;
      this.shownAt = Date.now();
      this.visible.set(true);
    }, APPEAR_DELAY_MS);
  }

  end(): void {
    this.inFlight.update((count) => Math.max(0, count - 1));
    if (this.inFlight() !== 0) {
      return;
    }

    this.cancelAppear();
    if (!this.visible()) {
      return;
    }

    const remaining = MIN_VISIBLE_MS - (Date.now() - this.shownAt);
    if (remaining <= 0) {
      this.visible.set(false);
      return;
    }

    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.visible.set(false);
    }, remaining);
  }

  private cancelAppear(): void {
    if (this.appearTimer !== null) {
      clearTimeout(this.appearTimer);
      this.appearTimer = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
