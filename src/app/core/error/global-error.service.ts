import { ApplicationRef, Injectable, computed, inject, signal } from '@angular/core';
import { BroochError } from './error.model';

const AUTO_DISMISS_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class GlobalErrorService {
  private readonly appRef = inject(ApplicationRef);
  private readonly errorSignal = signal<BroochError | null>(null);
  private readonly retryAfterSignal = signal(0);
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  readonly error = this.errorSignal.asReadonly();
  readonly retryAfter = this.retryAfterSignal.asReadonly();

  readonly fieldErrorList = computed(() => {
    const failure = this.errorSignal();
    if (!failure?.fieldErrors) {
      return [] as { field: string; message: string }[];
    }
    return Object.entries(failure.fieldErrors).flatMap(([field, items]) =>
      items.map((item) => ({ field, message: item.message })),
    );
  });

  show(error: BroochError): void {
    this.errorSignal.set(error);
    this.startRetryCountdown(error.retryAfterSeconds);
    this.scheduleAutoDismiss();
    this.notifyViews();
  }

  clear(): void {
    this.stopAutoDismiss();
    this.stopRetryCountdown();
    this.errorSignal.set(null);
    this.retryAfterSignal.set(0);
    this.notifyViews();
  }

  dismiss(): void {
    this.clear();
  }

  private scheduleAutoDismiss(): void {
    this.stopAutoDismiss();
    this.dismissTimer = setTimeout(() => {
      this.dismissTimer = null;
      this.clear();
    }, AUTO_DISMISS_MS);
  }

  private stopAutoDismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  private startRetryCountdown(seconds: number | null): void {
    this.stopRetryCountdown();
    if (!seconds || seconds <= 0) {
      this.retryAfterSignal.set(0);
      return;
    }
    this.retryAfterSignal.set(seconds);
    this.countdownTimer = setInterval(() => {
      const next = this.retryAfterSignal() - 1;
      if (next <= 0) {
        this.stopRetryCountdown();
        this.retryAfterSignal.set(0);
        this.notifyViews();
        return;
      }
      this.retryAfterSignal.set(next);
      this.notifyViews();
    }, 1000);
  }

  private stopRetryCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /** HTTP interceptors emit on RxJS schedulers — tick so zoneless views update. */
  private notifyViews(): void {
    this.appRef.tick();
  }
}
