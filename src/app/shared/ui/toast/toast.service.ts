import { Service, signal } from '@angular/core';

export type ToastTone = 'success' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Translation keys — the host renders them, so a language switch re-renders the toast. */
  titleKey: string;
  messageKey: string;
  durationMs?: number;
  /** Runs once the toast has gone — timed out or closed — never when it is merely shown. */
  onClose?: () => void;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  titleKey: string;
  messageKey: string;
  durationMs: number;
  /** Playing its exit; removed once `LEAVE_MS` has passed. */
  leaving: boolean;
}

interface Countdown {
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
  onClose?: () => void;
}

const DEFAULT_DURATION_MS = 5_000;

/**
 * Matches the host's `toast-out` animation. The exit is timed here rather than with
 * `animate.leave`, whose runtime would sit in every visitor's first download for a toast that
 * shows once per purchase.
 */
const LEAVE_MS = 260;

/**
 * Short-lived confirmations that float above the page — "payment successful", never failures.
 * HTTP failures keep their single home on the global error banner; this is not a second error UI.
 *
 * A toast pauses while it is hovered or focused, so a payer who is still reading it — or who
 * tabbed to its close button — never loses it mid-sentence.
 */
@Service()
export class ToastService {
  private readonly items = signal<readonly Toast[]>([]);
  private readonly countdowns = new Map<number, Countdown>();
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  /**
   * Shows a toast, or returns the one already on screen with the same copy — two navigations
   * that both raise it must not stack two identical toasts.
   */
  show(options: ToastOptions): number {
    const showing = this.items().find(
      (toast) =>
        !toast.leaving &&
        toast.titleKey === options.titleKey &&
        toast.messageKey === options.messageKey,
    );
    if (showing) {
      return showing.id;
    }

    const toast: Toast = {
      id: this.nextId++,
      tone: options.tone ?? 'success',
      titleKey: options.titleKey,
      messageKey: options.messageKey,
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      leaving: false,
    };
    this.items.update((list) => [...list, toast]);
    this.countdowns.set(toast.id, {
      timer: null,
      remainingMs: toast.durationMs,
      startedAt: 0,
      onClose: options.onClose,
    });
    this.resume(toast.id);
    return toast.id;
  }

  /** Starts the exit; the toast leaves the list once the animation has played. */
  dismiss(id: number): void {
    const countdown = this.countdowns.get(id);
    if (!countdown) {
      return;
    }
    if (countdown.timer) {
      clearTimeout(countdown.timer);
    }
    this.countdowns.delete(id);
    countdown.onClose?.();
    this.items.update((list) =>
      list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );
    setTimeout(
      () => this.items.update((list) => list.filter((toast) => toast.id !== id)),
      LEAVE_MS,
    );
  }

  pause(id: number): void {
    const countdown = this.countdowns.get(id);
    if (!countdown?.timer) {
      return;
    }
    clearTimeout(countdown.timer);
    countdown.timer = null;
    countdown.remainingMs = Math.max(0, countdown.remainingMs - (Date.now() - countdown.startedAt));
  }

  resume(id: number): void {
    const countdown = this.countdowns.get(id);
    if (!countdown || countdown.timer) {
      return;
    }
    countdown.startedAt = Date.now();
    countdown.timer = setTimeout(() => this.dismiss(id), countdown.remainingMs);
  }
}
